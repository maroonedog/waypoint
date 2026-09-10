// ===========================================================================
// form-resolver.types.ts — how a schema that does NOT implement the contract
// is still described.
//
// Requiring every validator to implement `~form` would make this contract
// useless on the day it ships, because no released validator carries it. A
// resolver is the outside-in path: a separate module that knows one vendor's
// schema shape and produces descriptors from it, so the description works
// without the validator's cooperation or its version being new enough.
//
// `canResolve` is a type guard rather than a boolean check so that
// `resolveFields` can take the narrowed type and need no cast to reach it.
// ===========================================================================
import type { FormFieldDescriptor } from "./form-field-descriptor.types.js";

/** Describes one vendor's schemas from the outside. */
export interface FormResolver<TSchema> {
  /** Who this resolver understands, used when reporting that none matched. */
  readonly vendor: string;
  /** True when this resolver can describe the given schema. */
  canResolve(schema: unknown): schema is TSchema;
  /** The declared fields, in declaration order. */
  resolveFields(schema: TSchema): readonly FormFieldDescriptor[];
}

/**
 * A resolver whose schema type the holder no longer knows. A list of
 * resolvers for different vendors has no common schema type, so the type is
 * dropped at the point the resolvers are collected rather than widened to a
 * union nobody can satisfy.
 */
export interface ErasedFormResolver {
  readonly vendor: string;
  canResolve(schema: unknown): boolean;
  resolveFields(schema: unknown): readonly FormFieldDescriptor[];
}
