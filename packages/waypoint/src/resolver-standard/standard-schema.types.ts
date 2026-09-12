// ===========================================================================
// standard-schema.types.ts — the two specs this resolver is written against,
// declared here rather than installed.
//
// DECLARED, NOT IMPORTED, for the reason read-zod-definition.ts gives about
// zod: this package lists zero dependencies, and every vendor it touches it
// reads structurally. Depending on `@standard-schema/spec` would put a version
// range on a package that is nothing but these interfaces, and a consumer who
// resolved a different one would be told two structurally identical types are
// incompatible. The specs themselves expect this — zod does not import them
// either; it vendors its own copy at `zod/src/v4/core/standard-schema.ts`,
// which is where the shapes below were read from and checked member for
// member.
//
// Only what is read. The published specs also carry `output` converters,
// `InferOutput`, and a `StandardTypedV1` base the two share; a form edits the
// value going IN, so this file names the input side and stops.
//
// The two specs are separate on purpose, and that separation is the whole
// degradation story. A vendor may implement `~standard.validate` and say
// nothing about JSON Schema — valibot and yup are the ones the design study
// measured — and the only honest way to report that is to let the compiler
// see it. `StandardSchemaV1` is what such a vendor satisfies;
// `StandardSchemaWithJSON` is what a vendor that can also describe itself
// satisfies; and a resolver overloaded on the two makes "this validator
// declares no JSON Schema" a compile error that names the missing member
// rather than an empty field list nobody notices.
// ===========================================================================

/** One segment of an issue's path, in the object spelling some vendors use. */
export interface StandardPathSegment {
  readonly key: PropertyKey;
}

/**
 * One thing a vendor found wrong. `message` is the only member the spec
 * requires, and `code` is deliberately absent from it — several vendors
 * return one anyway, but under four different names, so nothing here reads it.
 */
export interface StandardIssue {
  readonly message: string;
  readonly path?:
    | ReadonlyArray<PropertyKey | StandardPathSegment>
    | undefined;
}

/** A verdict. Issues present means it failed; absent means it passed. */
export type StandardResult =
  | { readonly issues?: undefined }
  | { readonly issues: ReadonlyArray<StandardIssue> };

/** The inferred types a vendor may attach. Optional in the spec. */
export interface StandardTypes<Input> {
  readonly input: Input;
}

/** The properties a validator carries. */
export interface StandardValidatorProps<Input> {
  readonly version: 1;
  readonly vendor: string;
  readonly types?: StandardTypes<Input> | undefined;
  readonly validate: (
    value: unknown
  ) => StandardResult | Promise<StandardResult>;
}

/**
 * The two arguments a converter takes. `libraryOptions` is passed through
 * verbatim and never guessed: it is by definition the vendor's own vocabulary
 * — `{ unrepresentable: "any" }` is a word zod knows and nothing else does —
 * so inventing one would mean sending an unknown library a key it may reject.
 */
export interface StandardJsonSchemaOptions {
  readonly target: string;
  readonly libraryOptions?: Record<string, unknown> | undefined;
}

/** The converter a describing vendor carries. It is allowed to throw. */
export interface StandardJsonSchemaConverter {
  readonly input: (
    options: StandardJsonSchemaOptions
  ) => Record<string, unknown>;
}

/** What a validator that can also describe itself carries. */
export interface StandardDescriberProps<Input>
  extends StandardValidatorProps<Input> {
  readonly jsonSchema: StandardJsonSchemaConverter;
}

/** A validator that judges, and says nothing about JSON Schema. */
export interface StandardSchemaV1<Input = unknown> {
  readonly "~standard": StandardValidatorProps<Input>;
}

/** A validator that judges AND describes itself as a JSON Schema. */
export interface StandardSchemaWithJSON<Input = unknown> {
  readonly "~standard": StandardDescriberProps<Input>;
}

/**
 * The value type a vendor declared, or `unknown` when it declared none.
 * `types` is optional in the spec, so a vendor that omits it has to degrade to
 * an untyped form rather than fail to compile.
 */
export type StandardInput<S extends StandardSchemaV1> = NonNullable<
  S["~standard"]["types"]
>["input"];
