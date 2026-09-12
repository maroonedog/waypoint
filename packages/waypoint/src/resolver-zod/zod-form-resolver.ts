// ===========================================================================
// zod-form-resolver.ts — the generic resolver, plus the three things zod's own
// JSON Schema gets wrong about zod.
//
// KEPT, AND THE DIFF IS THE ARGUMENT. zod implements both specs fully, so this
// file looks redundant until you run the two paths side by side. Measured here
// against zod 4.6.1, over every schema in test/zod-resolver.test.mjs plus one
// written to provoke it, the generic walk reproduced the old hand-written one
// byte for byte on every field except three:
//
//   `z.date()`             kind "date"      → "unknown"   (not representable)
//   `z.enum({Admin:"admin"})`  label "Admin"    → "admin"     (enum carries values)
//   `z.number().int()`     no minimum       → minimum: -9007199254740991
//
// Each is UI that changes under a version bump — a date picker becoming a text
// box, an option's text losing its capital, `min="-9007199254740991"` appearing
// on a number input — so a caller of `zodFormResolver` gets the same
// descriptors as before and no migration. Everything else this resolver used
// to do is gone: `.describe()` and `.meta()` text survives into `title` and
// `description` on its own, bounds and formats match, and the issue half was
// already identical.
//
// THE FRAGILE READ SHRANK RATHER THAN VANISHED. `_zod.def` is still read, for
// the first two above. What changed is the blast radius: a zod internal rename
// used to empty EVERY descriptor while validation kept working and nothing
// said a word, and now it degrades a correct descriptor list by one widget and
// some option text. The safe-integer bound needs no internals at all — it is
// two constants on a finished descriptor — so it is corrected here.
//
// `libraryOptions: { unrepresentable: "any" }` is zod's word and is passed on
// every call. Without it `z.date()` anywhere in a schema throws the WHOLE
// document away, not just that field, and the form would draw nothing.
// ===========================================================================
import type * as z from "zod";
import type {
  FieldPath,
  FormAdapter,
  FormFieldDescriptor,
  FormIssue,
  MaybeAsync,
} from "../contract/index.js";
import {
  mapStandardVerdict,
  standardFormResolver,
} from "../resolver-standard/index.js";
import {
  collectZodOverrides,
  type ZodFieldOverride,
} from "./collect-zod-overrides.js";
import { zodResultToFormIssues } from "./zod-issues-to-form-issues.js";

/** What zod needs said to it before it will describe a schema holding a Date. */
const ZOD_LIBRARY_OPTIONS = { unrepresentable: "any" } as const;

/**
 * The bounds `.int()` writes for itself. They are the range of a JavaScript
 * safe integer, not a rule the author wrote, and an input carrying them as
 * `min`/`max` would be asserting something nobody declared.
 */
const SYNTHETIC_INTEGER_BOUNDS: ReadonlySet<number> = new Set([
  Number.MIN_SAFE_INTEGER,
  Number.MAX_SAFE_INTEGER,
]);

/**
 * A dropped bound is rebuilt by inclusion rather than deleted, because the
 * contract's constraints are readonly and `exactOptionalPropertyTypes` is on:
 * an absent bound has to be an absent MEMBER, never one written `undefined`.
 */
function withoutSyntheticBounds(
  field: FormFieldDescriptor
): FormFieldDescriptor {
  const { minimum, maximum, ...rest } = field.constraints;
  const keepsMinimum =
    minimum !== undefined && !SYNTHETIC_INTEGER_BOUNDS.has(minimum);
  const keepsMaximum =
    maximum !== undefined && !SYNTHETIC_INTEGER_BOUNDS.has(maximum);
  if (keepsMinimum === (minimum !== undefined) && keepsMaximum === (maximum !== undefined)) {
    return field;
  }
  return {
    ...field,
    constraints: {
      ...rest,
      ...(keepsMinimum ? { minimum } : {}),
      ...(keepsMaximum ? { maximum } : {}),
    },
  };
}

/** One descriptor, with whatever zod knows that its document did not say. */
function refineZodField(
  field: FormFieldDescriptor,
  override: ZodFieldOverride | undefined
): FormFieldDescriptor {
  const bounded = withoutSyntheticBounds(field);
  if (override === undefined) return bounded;
  return {
    ...bounded,
    ...(override.isDate === true ? { kind: "date" as const } : {}),
    ...(override.choices === undefined ? {} : { choices: override.choices }),
  };
}

/**
 * Builds a form adapter from a zod object schema.
 *
 * zod is imported for its TYPES only. `import type` is erased at build time,
 * so the compiled output never mentions zod and installing this resolver
 * cannot pull in a second copy or pin a version — while `z.infer` still gives
 * the form the real value type rather than `unknown`.
 *
 * The paths come from the inferred type rather than from the schema, because
 * every member of a zod schema is declared: for this vendor the shape IS the
 * declaration, and there is no narrower set to offer.
 */
export function zodFormResolver<S extends z.ZodObject>(
  schema: S
): FormAdapter<z.infer<S>, FieldPath<z.infer<S>>> {
  const described = standardFormResolver(schema, {
    libraryOptions: ZOD_LIBRARY_OPTIONS,
  });

  const overrides = new Map<string, ZodFieldOverride>();
  collectZodOverrides(schema, "", overrides);

  return {
    fields: described.fields.map((field) =>
      refineZodField(field, overrides.get(field.path))
    ),
    // The descriptors come from the generic resolver and the verdict does not,
    // because `code` is not a member the spec has — see
    // zod-issues-to-form-issues.ts. `~standard.validate` is still what is
    // called, rather than the `safeParse` this resolver used to call: it is
    // the spec'd entry point, it returns the same issues, and it is the one
    // that survives an async refinement instead of throwing on it.
    validate(root: unknown): MaybeAsync<readonly FormIssue[]> {
      return mapStandardVerdict(
        schema["~standard"].validate(root),
        zodResultToFormIssues
      );
    },
  };
}
