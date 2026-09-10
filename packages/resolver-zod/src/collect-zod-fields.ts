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
// ===========================================================================
import type { FormFieldChoice, FormFieldDescriptor } from "form-contract";
import { readZodDefinition, type ZodDefinition } from "./read-zod-definition.js";
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

function describeLeaf(
  path: string,
  definition: ZodDefinition,
  isRequired: boolean
): FormFieldDescriptor {
  const constraints = zodDefinitionToConstraints(definition);
  const kind = zodDefinitionToKind(definition.type);
  const choices = readChoices(definition);
  return choices === undefined
    ? { path, kind, isRequired, constraints }
    : { path, kind, isRequired, constraints, choices };
}

/** Appends one descriptor per leaf reachable from this definition. */
export function collectZodFields(
  definition: ZodDefinition,
  path: string,
  collected: FormFieldDescriptor[]
): void {
  const { definition: inner, isRequired } = unwrapZodDefinition(definition);

  if (inner.type === "object" && inner.shape !== undefined) {
    for (const [key, member] of Object.entries(inner.shape)) {
      const memberDefinition = readZodDefinition(member);
      if (memberDefinition !== undefined) {
        collectZodFields(memberDefinition, joinPath(path, key), collected);
      }
    }
    return;
  }

  if (inner.type === "array") {
    const element = readZodDefinition(inner.element);
    if (element !== undefined) {
      collectZodFields(element, `${path}[*]`, collected);
      return;
    }
  }

  if (path !== "") collected.push(describeLeaf(path, inner, isRequired));
}
