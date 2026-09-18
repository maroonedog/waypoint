import { toStandardJsonSchema } from "@valibot/to-json-schema";
import {
  safeParse,
  safeParseAsync,
  pick,
  type Config,
  type GenericSchema,
  type GenericSchemaAsync,
  type InferInput,
  type InferIssue,
} from "valibot";
import { isPending, type FormAdapter, type FormIssue, type MaybeAsync, type PartialValidationResult } from "../contract/index.js";
import {
  formatIssuePath,
  standardFormResolver,
  type DeclaredFormFields,
  type StandardFormOptions,
  type StandardPaths,
} from "../resolver-standard/index.js";

type ValibotSchema = GenericSchema | GenericSchemaAsync;

export interface ValibotFormOptions<S extends ValibotSchema> extends StandardFormOptions {
  /** Select top-level object subtrees; root pipes and unsupported shapes use full validation. */
  readonly partial?: boolean;
  /** Validation must collect all issues, including all failing pipe actions. */
  readonly validation?: Omit<Config<InferIssue<S>>, "abortEarly" | "abortPipeEarly">;
}

/** Describe synchronous schemas through the official JSON Schema converter. */
export function valibotFormResolver<S extends GenericSchema>(
  schema: S,
  options?: ValibotFormOptions<S> & Partial<DeclaredFormFields>
): FormAdapter<InferInput<S>, StandardPaths<InferInput<S>>, InferIssue<S>["type"]>;
/** Async schemas require fields because the official converter accepts sync schemas. */
export function valibotFormResolver<S extends ValibotSchema>(
  schema: S,
  options: ValibotFormOptions<S> & DeclaredFormFields
): FormAdapter<InferInput<S>, StandardPaths<InferInput<S>>, InferIssue<S>["type"]>;
export function valibotFormResolver<S extends ValibotSchema>(
  schema: S,
  options: ValibotFormOptions<S> & Partial<DeclaredFormFields> = {}
): FormAdapter<InferInput<S>, StandardPaths<InferInput<S>>, InferIssue<S>["type"]> {
  let fields = options.fields;
  if (fields === undefined) {
    if (schema.async) {
      throw new TypeError("valibotFormResolver: async schemas require explicit fields.");
    }
    fields = standardFormResolver(toStandardJsonSchema(schema), options).fields;
  }
  const config = { ...options.validation, abortEarly: false, abortPipeEarly: false };
  const issuesFrom = (result: { readonly issues?: readonly InferIssue<S>[] | undefined }): readonly FormIssue<InferIssue<S>["type"]>[] =>
    (result.issues ?? []).map((issue) => ({
      path: formatIssuePath(issue.path),
      message: issue.message,
      code: issue.type,
    }));
  const validate = (root: unknown): MaybeAsync<readonly FormIssue<InferIssue<S>["type"]>[]> => {
    // Parse through Valibot's public API to override global abort settings.
    // The form edits input values; parsed/transformed output is not submitted.
    return schema.async
      ? safeParseAsync(schema, root, config).then(issuesFrom)
      : issuesFrom(safeParse(schema, root, config));
  };
  type Verdict = PartialValidationResult<InferIssue<S>["type"]>;
  const fullResult = (root: unknown): MaybeAsync<Verdict> => {
    const outcome = validate(root);
    const wrap = (issues: readonly FormIssue<InferIssue<S>["type"]>[]): Verdict => ({ paths: [""], issues });
    return isPending(outcome) ? outcome.then(wrap) : wrap(outcome);
  };
  const validatePartial = (root: unknown, paths: readonly string[]): MaybeAsync<Verdict> => {
    if (!["object", "strict_object", "loose_object", "object_with_rest"].includes(schema.type) ||
        "pipe" in schema || "fallback" in schema || !("entries" in schema) ||
        root === null || typeof root !== "object" || Array.isArray(root) || paths.length === 0)
      return fullResult(root);
    const prototype = Object.getPrototypeOf(root);
    if (prototype !== null && prototype !== Object.prototype) return fullResult(root);
    // These object kinds expose entries and support the public pick operation.
    // Pipe and fallback wrappers must retain the original root execution.
    const objectSchema = schema as Parameters<typeof pick>[0];
    const keys = [...new Set(paths.map(path => path.split(/[.\[]/, 1)[0] ?? ""))];
    const ownsEntry = (key: string): boolean => Object.prototype.hasOwnProperty.call(objectSchema.entries, key);
    if (keys.some(key => !ownsEntry(key)) || Object.keys(root).some(key => !ownsEntry(key)))
      return fullResult(root);
    const first = keys[0];
    if (first === undefined) return fullResult(root);
    // Selection retains only original entries, so every emitted issue still
    // belongs to S. The selected output is deliberately not used as S's value.
    const selected = pick(objectSchema, [first, ...keys.slice(1)]) as ValibotSchema as S;
    const subject = Object.fromEntries(keys
      .filter(key => Object.prototype.hasOwnProperty.call(root, key))
      .map(key => [key, (root as Record<string, unknown>)[key]]));
    const verdictFrom = (result: { readonly issues?: readonly InferIssue<S>[] | undefined }): MaybeAsync<Verdict> => {
      const issues = issuesFrom(result);
      // A wrapper can retain the original schema's runner. Never publish its
      // unrelated or root issues as if they were a scoped replacement.
      if (issues.some(issue => !keys.some(key => issue.path === key ||
          issue.path.startsWith(`${key}.`) || issue.path.startsWith(`${key}[`))))
        return fullResult(root);
      return { paths: keys, issues };
    };
    return selected.async
      ? safeParseAsync(selected, subject, config).then(verdictFrom)
      : verdictFrom(safeParse(selected, subject, config));
  };
  return {
    fields,
    validate,
    ...(options.partial === true ? { validatePartial } : {}),
  };
}
