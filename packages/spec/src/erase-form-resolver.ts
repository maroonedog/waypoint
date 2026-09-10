// ===========================================================================
// erase-form-resolver.ts — drops a resolver's schema type so resolvers for
// different vendors can be held in one list.
//
// The guard is re-run inside the erased `resolveFields` rather than trusted.
// Erasing removes the compiler's ability to keep the two calls in agreement,
// so a caller that describes a schema the resolver rejected would otherwise
// reach the vendor's code with a shape it never agreed to read.
// ===========================================================================
import type {
  ErasedFormResolver,
  FormResolver,
} from "./form-resolver.types.js";
import type { FormFieldDescriptor } from "./form-field-descriptor.types.js";

/** Wraps a typed resolver as one whose schema type is no longer known. */
export function eraseFormResolver<TSchema>(
  resolver: FormResolver<TSchema>
): ErasedFormResolver {
  return {
    vendor: resolver.vendor,
    canResolve: (schema: unknown): boolean => resolver.canResolve(schema),
    resolveFields: (schema: unknown): readonly FormFieldDescriptor[] => {
      if (!resolver.canResolve(schema)) {
        throw new TypeError(
          `The ${resolver.vendor} resolver was asked to describe a schema it ` +
            `does not claim.`
        );
      }
      return resolver.resolveFields(schema);
    },
  };
}
