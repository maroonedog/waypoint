// ===========================================================================
// describe-react-environment.ts — the versions every row was measured against.
//
// Printed above the tables rather than in a footnote: a reader comparing two
// libraries has to know that both were driven by the same React, and a
// benchmark that omits it is asking to be re-run and disbelieved.
// ===========================================================================
import { readInstalledVersion } from "./read-installed-version.ts";

/** Every package whose version could change a number in this report. */
export const MEASURED_PACKAGES = [
  "react",
  "react-dom",
  "zod",
  "react-hook-form",
  "@hookform/resolvers",
  "formik",
  "@tanstack/react-form",
  "zustand",
  "jsdom",
] as const;

export function describeReactEnvironment(): Readonly<Record<string, string>> {
  const described: Record<string, string> = {};
  for (const name of MEASURED_PACKAGES) {
    described[name] = readInstalledVersion(name);
  }
  return described;
}
