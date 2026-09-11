// ===========================================================================
// subjects.ts — how a subject id is spelled on the website.
//
// The ids are the benchmark's own, imported from nothing and mapped here to
// something a reader can scan. An id with no entry falls through as itself
// rather than disappearing, so adding a subject to the harness can never
// silently drop a row from this site.
// ===========================================================================

export const PRIMARY = "form-contract-use-field";
export const UNCONTROLLED = "form-contract-uncontrolled";
export const DENOMINATOR = "hand-written-per-field-state";

const LABELS: Readonly<Record<string, string>> = {
  "form-contract-use-field": "form-contract (useField)",
  "form-contract-uncontrolled": "form-contract (uncontrolled)",
  "hand-written-per-field-state": "hand-written per-field state",
  "react-hook-form-scoped": "react-hook-form (scoped)",
  "react-hook-form-deps": "react-hook-form (deps)",
  "react-hook-form-on-submit": "react-hook-form (on-submit)",
  "formik-use-field": "Formik (useField)",
  "formik-fast-field": "Formik (FastField)",
  "tanstack-form-level": "TanStack Form",
};

export const label = (id: string): string => LABELS[id] ?? id;
