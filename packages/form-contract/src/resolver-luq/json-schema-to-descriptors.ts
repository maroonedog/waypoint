// ===========================================================================
// json-schema-to-descriptors.ts — a draft-07 document, walked into one
// descriptor per leaf.
//
// luq does not hand a form its fields directly. It hands out a JSON Schema,
// which is the interesting part: this resolver is written against a FORMAT
// rather than against luq's internals, so nothing here reaches for a private
// member and a luq release cannot quietly break it. The cost is that it can
// only describe what the schema says — a rule luq could not represent as a
// keyword is not in the document, so it is not in the descriptors either, and
// the field is still judged at validation time where the rule really lives.
//
// The walk is the same shape the zod resolver's is, and for the same reasons:
// a container contributes no descriptor of its own, and an array descends once
// through `[*]` rather than once per element, because the number of elements
// is not known until there is a value and the description has to be readable
// before one exists.
//
// `title` and `description` are the two annotation keywords read here, and
// they are read verbatim. draft-07 already has the vocabulary for a field's
// name and its help text, so a document that carries them is answering the
// question and a document that omits them is declining to — which the
// descriptor repeats as an absent member rather than papering over.
// ===========================================================================
import type {
  FormFieldChoice,
  FormFieldConstraints,
  FormFieldDescriptor,
  FormFieldKind,
} from "../contract/index.js";

/** Only what this walk reads. A draft-07 document has far more in it. */
interface JsonSchemaNode {
  readonly title?: string;
  readonly description?: string;
  readonly type?: string | readonly string[];
  readonly properties?: Readonly<Record<string, JsonSchemaNode>>;
  readonly required?: readonly string[];
  readonly items?: JsonSchemaNode;
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
}

const KIND_OF_JSON_TYPE: Readonly<Record<string, FormFieldKind>> = {
  string: "string",
  number: "number",
  integer: "number",
  boolean: "boolean",
  array: "array",
  object: "object",
};

/**
 * A nullable field arrives as `["string", "null"]`. The null is presence
 * information, which `isRequired` already carries, so the kind is the other
 * member rather than "unknown".
 */
const kindOf = (node: JsonSchemaNode): FormFieldKind => {
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
const constraintsOf = (node: JsonSchemaNode): FormFieldConstraints => {
  const constraints: {
    minimum?: number;
    maximum?: number;
    minLength?: number;
    maxLength?: number;
    step?: number;
    pattern?: RegExp;
    format?: string;
  } = {};
  if (typeof node.minimum === "number") constraints.minimum = node.minimum;
  if (typeof node.maximum === "number") constraints.maximum = node.maximum;
  if (typeof node.minLength === "number") constraints.minLength = node.minLength;
  if (typeof node.maxLength === "number") constraints.maxLength = node.maxLength;
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

export function collectJsonSchemaFields(
  node: JsonSchemaNode,
  path: string,
  isRequired: boolean,
  collected: FormFieldDescriptor[]
): void {
  const kind = kindOf(node);

  if (kind === "object" && node.properties !== undefined) {
    const required = new Set(node.required ?? []);
    for (const [key, child] of Object.entries(node.properties)) {
      collectJsonSchemaFields(child, joinPath(path, key), required.has(key), collected);
    }
    return;
  }

  if (kind === "array" && node.items !== undefined) {
    collectJsonSchemaFields(node.items, `${path}[*]`, true, collected);
    return;
  }

  if (path === "") return;

  const constraints = constraintsOf(node);
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
