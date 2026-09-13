// ===========================================================================
// read-standard-json-schema.ts — asks a vendor to describe itself, and says
// exactly which way it declined.
//
// THE THREE ANSWERS ARE THE POINT. Before this file existed they were one
// answer — an empty field list — and a form that drew nothing could not be
// told from a form that had nothing to draw. So the outcome is a discriminated
// state rather than a document-or-nothing: `undeclared` is a vendor that never
// implements the JSON Schema spec, `unavailable` is one that implements it and
// threw, and a document that walks to zero leaves is neither of those. Each
// gets its own sentence in warn-undescribed-form.ts, and a caller who wants to
// branch rather than read a console can switch on `state`.
//
// TWO TARGETS, IN ORDER. The spec's own text calls `draft-2020-12` and
// `draft-07` both "strongly recommended" and tells a library to throw on a
// target it does not support, so the only way to learn what a vendor speaks is
// to ask. 2020-12 is asked first because it is the newer of the two and
// because a vendor that supports exactly one of them may support only that one;
// the fallback costs a second call on exactly the vendors that need it.
//
// A THROW IS A DECLINE, NOT A FAULT. Producing a JSON Schema is where vendors
// fail, and they fail for ordinary reasons: run here against zod 4.6.4,
// `z.object({ when: z.date() })` throws `Date cannot be represented in JSON
// Schema` and emits NO property at all, not merely a lossy one — the whole
// document is lost to one field. Letting that reach the caller would mean a
// form that validates perfectly refuses to construct, so the reason is caught,
// carried, and reported.
// ===========================================================================
import type { JsonSchemaNode } from "./json-schema-to-descriptors.js";
import type { StandardJsonSchemaConverter } from "./standard-schema.types.js";

/**
 * The targets asked for, newest first. Both are named in the spec as the ones
 * implementers should support; `openapi-3.0` is not asked for, because it is a
 * SUBSET of an early JSON Schema draft with keywords of its own — it drops
 * vocabulary this walk reads and adds `nullable` and `discriminator`, which
 * it does not. Asking for it would lose constraints and gain nothing.
 */
const ASKED_TARGETS: readonly string[] = ["draft-2020-12", "draft-07"];

/** Which of the three ways a vendor answered the question. */
export type JsonSchemaDeclaration =
  /** It described itself. */
  | { readonly state: "declared"; readonly document: JsonSchemaNode }
  /** It does not implement the JSON Schema spec at all. */
  | { readonly state: "undeclared" }
  /** It implements the spec and could not produce a document. */
  | { readonly state: "unavailable"; readonly reason: string };

/** A thrown value's text, whatever the vendor chose to throw. */
const reasonOf = (thrown: unknown): string => {
  if (thrown instanceof Error) return thrown.message;
  return typeof thrown === "string" ? thrown : String(thrown);
};

/**
 * The document, or the reason there is none.
 *
 * `libraryOptions` travels through untouched. It is the vendor's own
 * vocabulary — `{ unrepresentable: "any" }` is a word zod knows and no other
 * library does — so guessing one would mean sending an unknown library a key
 * it is entitled to reject.
 */
export function readStandardJsonSchema(
  converter: StandardJsonSchemaConverter | undefined,
  libraryOptions: Record<string, unknown> | undefined
): JsonSchemaDeclaration {
  if (converter === undefined || typeof converter.input !== "function") {
    return { state: "undeclared" };
  }

  // Identical reasons are collapsed rather than repeated. A vendor that cannot
  // represent one of its own types fails the same way on every target — run
  // here, zod says `Date cannot be represented in JSON Schema` to both — and
  // printing that sentence twice would bury the one case worth seeing, a
  // vendor that speaks one draft and not the other. Those vendors name the
  // target in the message themselves, so nothing is lost by not prefixing it.
  const reasons: string[] = [];
  for (const target of ASKED_TARGETS) {
    try {
      const document = converter.input(
        libraryOptions === undefined ? { target } : { target, libraryOptions }
      );
      return { state: "declared", document: document as JsonSchemaNode };
    } catch (thrown) {
      const reason = reasonOf(thrown);
      if (!reasons.includes(reason)) reasons.push(reason);
    }
  }
  return { state: "unavailable", reason: reasons.join("; ") };
}
