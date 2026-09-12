// ===========================================================================
// collect-zod-fields.ts — walks a zod schema into one descriptor per leaf.
//
// A container contributes no descriptor of its own. Its shape is what a
// renderer draws, and emitting the container as well would give every group
// a second, empty widget.
//
// An array descends once through `[*]` rather than per element. The number of
// elements is not known until there is a value, and the description has to be
// readable before one exists.
//
// The walk carries SCHEMAS and reads the definition at each step, rather than
// carrying definitions as it once did. A definition is enough for kind and
// constraints but not for declared text: zod files `.describe()` and `.meta()`
// in a registry keyed by the schema object, so a walk that had already thrown
// the schema away could only report a field with no name.
// ===========================================================================
import type { FormFieldChoice, FormFieldDescriptor } from "form-contract";
import { readZodDefinition, type ZodDefinition } from "./read-zod-definition.js";
import { readZodMetadata } from "./read-zod-metadata.js";
import { unwrapZodDefinition } from "./unwrap-zod-definition.js";
import { zodDefinitionToConstraints } from "./zod-definition-to-constraints.js";
import { zodDefinitionToKind } from "./zod-definition-to-kind.js";

const joinPath = (parent: string, key: string): string =>
  parent === "" ? key : `${parent}.${key}`;

function readChoices(
  definition: ZodDefinition
): readonly FormFieldChoice[] | undefined {
  const entries = definition.entries;
  if (entries === undefined) return undefined;
  const choices: FormFieldChoice[] = [];
  for (const [label, value] of Object.entries(entries)) {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      choices.push({ value, label });
    }
  }
  return choices.length === 0 ? undefined : choices;
}

/**
 * `schema` is the outermost one at this path, wrappers included, because that
 * is what carries the declared text; `definition` is what unwrapping it left,
 * which is what carries the shape.
 *
 * An undeclared member is spread away rather than written as `undefined`. A
 * descriptor that said `label: undefined` would read as a field whose name was
 * considered and found empty, which is not what a silent schema means.
 */
function describeLeaf(
  path: string,
  schema: unknown,
  definition: ZodDefinition,
  isRequired: boolean
): FormFieldDescriptor {
  const { title, description } = readZodMetadata(schema);
  const choices = readChoices(definition);
  return {
    path,
    kind: zodDefinitionToKind(definition.type),
    isRequired,
    ...(title === undefined ? {} : { label: title }),
    ...(description === undefined ? {} : { description }),
    constraints: zodDefinitionToConstraints(definition),
    ...(choices === undefined ? {} : { choices }),
  };
}

/** Appends one descriptor per leaf reachable from this schema. */
export function collectZodFields(
  schema: unknown,
  path: string,
  collected: FormFieldDescriptor[]
): void {
  const definition = readZodDefinition(schema);
  if (definition === undefined) return;
  const { definition: inner, isRequired } = unwrapZodDefinition(definition);

  if (inner.type === "object" && inner.shape !== undefined) {
    for (const [key, member] of Object.entries(inner.shape)) {
      collectZodFields(member, joinPath(path, key), collected);
    }
    return;
  }

  if (inner.type === "array" && readZodDefinition(inner.element) !== undefined) {
    collectZodFields(inner.element, `${path}[*]`, collected);
    return;
  }

  if (path !== "") collected.push(describeLeaf(path, schema, inner, isRequired));
}
