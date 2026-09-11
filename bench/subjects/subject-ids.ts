// ===========================================================================
// subject-ids.ts — the two subjects every report is written around, as data.
//
// Data and nothing else, importing no React and no library, so that the Node
// driver of the browser lane can name the denominator without pulling
// react-dom into a process that has no DOM.
// ===========================================================================

/** The row this repository is arguing about. */
export const PRIMARY = "form-contract-use-field";

/**
 * The denominator. The design claim is "the store contributes nothing on top
 * of React", and a root-`useState` form re-renders everything, so beating THAT
 * would prove nothing. Every ratio in the time lane is against this subject
 * and no other.
 */
export const DENOMINATOR = "hand-written-per-field-state";
