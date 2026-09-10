// ===========================================================================
// zod-definition-to-constraints.ts — the renderable bounds of one zod
// definition.
//
// Bounds arrive by two routes. Most are entries in the check list, but a
// named string shape is a property of the definition itself, so both are read
// here; a reader of only one route reports no shape for a schema that has one.
//
// A check whose name is not listed here is skipped. Every check that survives
// becomes an attribute on an input, and a check nobody can draw has no
// attribute to become; dropping it leaves the field renderable and leaves the
// validator the only thing that enforces it.
//
// `greater_than` and `less_than` carry an `inclusive` flag. Only the
// inclusive form is read, because an exclusive bound has no HTML attribute
// and writing the neighbouring integer would change what the form accepts.
// ===========================================================================
import type { FormFieldConstraints } from "form-contract";
import type { ZodDefinition } from "./read-zod-definition.js";

type MutableConstraints = {
  -readonly [K in keyof FormFieldConstraints]?: FormFieldConstraints[K];
};

/** The bounds whose value is a number, so one setter can serve them all. */
type NumericConstraintKey =
  | "minimum"
  | "maximum"
  | "minLength"
  | "maxLength"
  | "step";

interface ZodCheckDefinition {
  readonly check?: string;
  readonly value?: unknown;
  readonly minimum?: unknown;
  readonly maximum?: unknown;
  readonly inclusive?: unknown;
  readonly format?: unknown;
}

function readCheckDefinition(check: unknown): ZodCheckDefinition | undefined {
  if (typeof check !== "object" || check === null) return undefined;
  const holder = check as Record<string, unknown>;
  const internals = holder["_zod"];
  const nested =
    typeof internals === "object" && internals !== null
      ? (internals as Record<string, unknown>)["def"]
      : undefined;
  const candidate = nested ?? holder["def"] ?? holder;
  return typeof candidate === "object" && candidate !== null
    ? (candidate as ZodCheckDefinition)
    : undefined;
}

/**
 * Writes the bound only when zod carried a number for it. Writing an absent
 * value would record "no bound" as a bound, and a renderer cannot tell the
 * two apart once the member exists.
 */
function setNumericConstraint(
  constraints: MutableConstraints,
  key: NumericConstraintKey,
  value: unknown
): void {
  if (typeof value === "number") constraints[key] = value;
}

function applyCheck(
  constraints: MutableConstraints,
  definition: ZodCheckDefinition
): void {
  const isInclusive = definition.inclusive !== false;
  switch (definition.check) {
    case "min_length":
      setNumericConstraint(constraints, "minLength", definition.minimum);
      return;
    case "max_length":
      setNumericConstraint(constraints, "maxLength", definition.maximum);
      return;
    case "greater_than":
      if (isInclusive) {
        setNumericConstraint(constraints, "minimum", definition.value);
      }
      return;
    case "less_than":
      if (isInclusive) {
        setNumericConstraint(constraints, "maximum", definition.value);
      }
      return;
    case "multiple_of":
      setNumericConstraint(constraints, "step", definition.value);
      return;
    case "string_format":
      if (typeof definition.format === "string") {
        constraints.format = definition.format;
      }
      return;
    default:
      return;
  }
}

/** The bounds a renderer can draw from a zod definition. */
export function zodDefinitionToConstraints(
  definition: ZodDefinition
): FormFieldConstraints {
  const constraints: MutableConstraints = {};
  if (typeof definition.format === "string") {
    constraints.format = definition.format;
  }
  for (const check of definition.checks ?? []) {
    const checkDefinition = readCheckDefinition(check);
    if (checkDefinition !== undefined) applyCheck(constraints, checkDefinition);
  }
  return constraints;
}
