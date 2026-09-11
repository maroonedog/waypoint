// ===========================================================================
// verdict.types.ts — what "the same observable state" means here.
//
// Read from the rendered DOM, never through a library API. Every library has
// its own name for an error and its own shape for a value; a person filling in
// the form sees neither. Comparing what reached the document is the only
// comparison that is about the form rather than about an API.
// ===========================================================================

export interface ObservableState {
  /** Every declared path to the string its input is showing. */
  readonly values: ReadonlyMap<string, string>;
  /** Every path whose message node is non-empty, to that message. */
  readonly messages: ReadonlyMap<string, string>;
  /** Every path whose input carries aria-invalid="true". */
  readonly invalidPaths: ReadonlySet<string>;
}

export interface VerdictDifference {
  readonly channel: "values" | "messages" | "invalid";
  readonly path: string;
  readonly subject: string | undefined;
  readonly oracle: string | undefined;
}

export type AgreementCell =
  | "agrees"
  | "agrees at submit only"
  | "by design"
  | "not applicable"
  | "disagrees";

export interface AgreementResult {
  readonly cell: AgreementCell;
  readonly differences: readonly VerdictDifference[];
  /** Written by whoever declared the capability or the policy. */
  readonly reason?: string;
}
