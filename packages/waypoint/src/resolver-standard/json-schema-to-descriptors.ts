// ===========================================================================
// json-schema-to-descriptors.ts — a JSON Schema document, walked into one
// descriptor per leaf.
//
// This walk used to live in `resolver-luq`, and it never belonged to luq. It
// reads a FORMAT, not a vendor: nothing here touches a private member, so no
// validator's release can quietly break it, and every vendor that answers
// `~standard.jsonSchema` gets described by the same code. That is what makes
// "validator-neutral" a property of the build rather than a claim supported by
// writing the walk twice. luq still reaches it, now by importing it from here.
//
// The cost is that it can only describe what the document says. A rule a
// vendor could not represent as a keyword is not in the document, so it is not
// in the descriptors either, and the field is still judged at validation time
// where the rule really lives. It also cannot tell a bound the author wrote
// from one the vendor synthesised — zod spells `.int()` as a pair of
// safe-integer bounds, joi gives every optional string `minLength: 1` — and
// filtering those needs vendor knowledge this file deliberately does not have.
// A vendor resolver that knows better refines the result afterwards.
//
// A container contributes no descriptor of its own, and an array descends once
// through `[*]` rather than once per element, because the number of elements
// is not known until there is a value and the description has to be readable
// before one exists.
//
// A POSITIONAL ARRAY STOPS AND BECOMES ONE LEAF. `items` has to be a schema
// OBJECT to be descended into; a tuple spells the positions elsewhere —
// `prefixItems` with `items: false` in 2020-12, an ARRAY of schemas under
// `items` in draft-07 — and neither is one element type. Descending anyway is
// what this walk used to do, and against zod 4.6.1's `items: false` it emitted
// a descriptor at `pair[*]` of kind "unknown" describing a `false`. There is
// no honest alternative to stopping: a descriptor is keyed by the RULE, and
// `declaredPathOf` rewrites `[0]` back to `[*]` before any lookup, so a
// descriptor emitted at `pair[0]` could never be found again. `FieldPath`
// stops at the same place for the same reason, so the type and the descriptors
// agree that a fixed tuple is one value drawn by its caller.
//
// A tuple with a REST element is a growable array again and keeps `[*]`, which
// is also what `FieldPath` does with it — and its one descriptor is the REST
// element's. That is wrong for the fixed prefix positions, which the rule/place
// split gives no way to describe separately; a rest tuple in a form is rare
// enough to be worth saying rather than solving.
//
// `title` and `description` are the two annotation keywords read here, and
// they are read verbatim. JSON Schema already has the vocabulary for a field's
// name and its help text, so a document that carries them is answering the
// question and a document that omits them is declining to — which the
// descriptor repeats as an absent member rather than papering over.
//
// A BINARY STRING IS A FILE, AND A DOCUMENT SAYS SO IN TWO SPELLINGS. A file
// upload is not a vendor fact: it is `type: "string"` carrying OpenAPI's
// `format: "binary"`, or 2020-12's `contentEncoding: "binary"`. Both are read,
// because a document may carry either — and zod 4.6.1's `z.file()` carries
// both, measured here as
// `{"type":"string","format":"binary","contentEncoding":"binary"}`. So every
// vendor answering `~standard.jsonSchema` gets a file widget out of this walk
// and no resolver has to reach a private member for one. Before this it was a
// TEXT BOX: the kind came back "string", `inputTypeFor` has no entry for the
// format "binary", and it fell through to `"text"`.
//
// A FILE'S LENGTH BOUNDS ARE DROPPED, which is half the reason this is a kind
// and not a format. `z.file().min(100).max(5000)` emits `minLength: 100,
// maxLength: 5000` — measured — and those are BYTES. `minLength` in this
// contract already means two things (shortest string, fewest array elements);
// admitting bytes as a third would put `minlength="100"` on a file input,
// where the browser counts characters of a value nobody can type. A constraint
// whose unit the contract cannot state is better absent than stated wrongly,
// so the byte bounds stop here and the validator goes on enforcing them.
// ===========================================================================
import type {
  FormFieldChoice,
  FormFieldConstraints,
  FormFieldDescriptor,
  FormFieldKind,
} from "../contract/index.js";
import { unionBranchesToMembers } from "./union-branches-to-members.js";

/** Only what this walk reads. A draft-07 document has far more in it. */
interface JsonSchemaNode {
  readonly title?: string;
  readonly description?: string;
  readonly type?: string | readonly string[];
  readonly properties?: Readonly<Record<string, JsonSchemaNode>>;
  readonly required?: readonly string[];
  /**
   * A schema when the array holds one element type, and something else when it
   * does not: `false` beside `prefixItems` in 2020-12, an array of schemas in
   * draft-07. Typed wide so both arrive rather than being asserted away.
   */
  readonly items?: JsonSchemaNode | readonly JsonSchemaNode[] | boolean;
  /** The branches of a union. `oneOf` is exclusive and `anyOf` is not; a form
   * draws the same fields either way, so both reach the same reading. */
  readonly oneOf?: readonly JsonSchemaNode[];
  readonly anyOf?: readonly JsonSchemaNode[];
  readonly enum?: readonly unknown[];
  readonly const?: unknown;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly exclusiveMinimum?: number;
  readonly exclusiveMaximum?: number;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly multipleOf?: number;
  readonly pattern?: string;
  readonly format?: string;
  /** `"binary"` is a file. 2020-12's spelling of what OpenAPI puts in `format`. */
  readonly contentEncoding?: string;
}

const KIND_OF_JSON_TYPE: Readonly<Record<string, FormFieldKind>> = {
  string: "string",
  number: "number",
  integer: "number",
  boolean: "boolean",
  array: "array",
  object: "object",
};

/** A string carrying bytes rather than text: `<input type="file">`. */
const isBinaryString = (node: JsonSchemaNode): boolean =>
  node.format === "binary" || node.contentEncoding === "binary";

/**
 * A nullable field arrives as `["string", "null"]`. The null is presence
 * information, which `isRequired` already carries, so the kind is the other
 * member rather than "unknown".
 *
 * The binary test comes first because a file IS declared as a string: reading
 * `type` before it would answer "string" and never look again.
 */
const kindOf = (node: JsonSchemaNode): FormFieldKind => {
  if (isBinaryString(node)) return "file";
  const type = node.type;
  if (typeof type === "string") return KIND_OF_JSON_TYPE[type] ?? "unknown";
  if (Array.isArray(type)) {
    const named = type.find((one) => one !== "null");
    return typeof named === "string" ? (KIND_OF_JSON_TYPE[named] ?? "unknown") : "unknown";
  }
  return node.enum !== undefined || node.const !== undefined ? "string" : "unknown";
};

/**
 * An exclusive bound is left out rather than shifted by one. Shifting is only
 * correct for integers, and a renderer that wants `min` can read the schema.
 */
const constraintsOf = (
  node: JsonSchemaNode,
  kind: FormFieldKind
): FormFieldConstraints => {
  const constraints: {
    minimum?: number;
    maximum?: number;
    minLength?: number;
    maxLength?: number;
    step?: number;
    pattern?: RegExp;
    format?: string;
  } = {};
  // On a file these two are a BYTE count, and this contract's minLength is a
  // character count or an element count. See the header: not carried at all,
  // rather than carried under a unit the descriptor cannot state.
  const carriesLength = kind !== "file";
  if (typeof node.minimum === "number") constraints.minimum = node.minimum;
  if (typeof node.maximum === "number") constraints.maximum = node.maximum;
  if (carriesLength && typeof node.minLength === "number") {
    constraints.minLength = node.minLength;
  }
  if (carriesLength && typeof node.maxLength === "number") {
    constraints.maxLength = node.maxLength;
  }
  if (typeof node.multipleOf === "number") constraints.step = node.multipleOf;
  if (typeof node.format === "string") constraints.format = node.format;
  if (typeof node.pattern === "string") {
    // A pattern that JavaScript cannot compile is left off rather than thrown
    // over: draft-07 specifies ECMA-262, but a document can carry anything.
    try {
      constraints.pattern = new RegExp(node.pattern);
    } catch {
      /* not representable here; validation still enforces it */
    }
  }
  return constraints;
};

/** Present only on a closed field, and only when every member can be drawn. */
const choicesOf = (node: JsonSchemaNode): readonly FormFieldChoice[] | undefined => {
  const members = node.enum ?? (node.const === undefined ? undefined : [node.const]);
  if (members === undefined) return undefined;
  const choices: FormFieldChoice[] = [];
  for (const value of members) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      choices.push({ value, label: String(value) });
    }
  }
  return choices.length === 0 ? undefined : choices;
};

const joinPath = (parent: string, key: string): string =>
  parent === "" ? key : `${parent}.${key}`;

/** The one element type an array holds, or none when the positions differ. */
const oneElementSchema = (
  items: JsonSchemaNode["items"]
): JsonSchemaNode | undefined =>
  typeof items === "object" && items !== null && !Array.isArray(items)
    ? (items as JsonSchemaNode)
    : undefined;

export function collectJsonSchemaFields(
  node: JsonSchemaNode,
  path: string,
  isRequired: boolean,
  collected: FormFieldDescriptor[]
): void {
  const kind = kindOf(node);

  // Before the `type` branches, because a union node declares no `type` at all
  // and would otherwise fall straight through to the leaf case.
  const branches = node.oneOf ?? node.anyOf;
  if (branches !== undefined) {
    const reading = unionBranchesToMembers(branches);
    if (reading.shape === "members") {
      for (const member of reading.members) {
        collectJsonSchemaFields(
          member.node,
          joinPath(path, member.key),
          member.isRequired,
          collected
        );
      }
      return;
    }
    if (reading.shape === "closed") {
      collectJsonSchemaFields(reading.node, path, isRequired, collected);
      return;
    }
    // "opaque" falls through: one leaf of kind "unknown", as before.
  }

  if (kind === "object" && node.properties !== undefined) {
    const required = new Set(node.required ?? []);
    for (const [key, child] of Object.entries(node.properties)) {
      collectJsonSchemaFields(child, joinPath(path, key), required.has(key), collected);
    }
    return;
  }

  if (kind === "array") {
    const element = oneElementSchema(node.items);
    if (element !== undefined) {
      collectJsonSchemaFields(element, `${path}[*]`, true, collected);
      return;
    }
  }

  if (path === "") return;

  const constraints = constraintsOf(node, kind);
  const choices = choicesOf(node);
  collected.push({
    path,
    kind,
    isRequired,
    // An annotation the document did not write is spread away rather than set
    // to `undefined`: a descriptor saying `label: undefined` would read as a
    // name that was considered and came out empty, and a silent document has
    // not considered it. Nothing here derives a name from `path` — that text
    // would be this package's wording, not the schema author's.
    ...(typeof node.title === "string" ? { label: node.title } : {}),
    ...(typeof node.description === "string"
      ? { description: node.description }
      : {}),
    constraints,
    ...(choices === undefined ? {} : { choices }),
  });
}

export type { JsonSchemaNode };
