// ===========================================================================
// subject-ids.ts — the two subjects every report is written around, as data.
//
// Data and nothing else, importing no React and no library, so that the Node
// driver of the browser lane can name the denominator without pulling
// react-dom into a process that has no DOM.
//
// WHY THESE STILL SAY `form-contract` AFTER THE PACKAGE WAS RENAMED. A subject
// id is a ROW KEY in recorded measurements, not the product's name. It is the
// primary key of `config/form-baseline.json` — `bench/report/baseline.ts`
// identifies a row by `shapeId|subjectId|scenarioId` — and it is the `label`
// field of every row in `docs/measurements-forms-time.json`. Renaming it
// therefore renames the keys of three recordings at once, and one of those
// three cannot be retaken here: `measurements-forms-time.json` records
// `"takenBy": "github actions run 34604664240"` on a headless Chrome under
// Linux, so the only way to move its keys is to hand-edit the row keys of a
// timing recording nobody re-ran — which is precisely the substitution this
// harness's gate exists to make impossible. Leaving it renamed in one file and
// not the other is worse still: `TimingTable.astro` matches rows by
// `row.one.label === UNCONTROLLED`, guarded by `ordered.some(...)`, so the
// mismatch would delete a paragraph from the built site and pass `astro check`.
//
// What a reader sees is NOT this string. `docs-site/src/subjects.ts` maps each
// id to a display label, and those labels carry the product's name. The id is
// what the measurement was filed under; the label is what the library is
// called. They are allowed to differ, and they differ deliberately here.
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
