// ===========================================================================
// subject-registry.ts — the subjects, in one place, for both lanes.
//
// The counts lane and the browser lane read THIS list. Two lists would be two
// things to keep in step, and a benchmark whose two lanes quietly measured
// different sets of libraries would be wrong in the one way neither lane could
// detect from the inside.
//
// It is imported dynamically by the counts lane, after the devtools hook is
// installed and jsdom exists: importing it at the top of that file would pull
// react-dom in before the hook, and the hook only sees commits from a
// react-dom that loaded after it.
// ===========================================================================
import type { Subject } from "./subject.types.ts";
import { formContractUseFieldSubject } from "./form-contract-use-field-subject.ts";
import { formContractUncontrolledSubject } from "./form-contract-uncontrolled-subject.ts";
import { handWrittenPerFieldStateSubject } from "./hand-written-per-field-state-subject.ts";
import {
  reactHookFormScopedSubject,
  reactHookFormDepsSubject,
  reactHookFormOnSubmitSubject,
} from "./react-hook-form-scoped-subject.ts";
import {
  formikUseFieldSubject,
  formikFastFieldSubject,
} from "./formik-use-field-subject.ts";
import { tanstackFormSubject } from "./tanstack-form-subject.ts";

export const SUBJECTS: readonly Subject[] = [
  formContractUseFieldSubject,
  formContractUncontrolledSubject,
  handWrittenPerFieldStateSubject,
  reactHookFormScopedSubject,
  reactHookFormDepsSubject,
  reactHookFormOnSubmitSubject,
  formikUseFieldSubject,
  formikFastFieldSubject,
  tanstackFormSubject,
];

export const subjectById = (id: string): Subject => {
  const found = SUBJECTS.find((subject) => subject.id === id);
  if (found === undefined) throw new Error(`no subject named "${id}"`);
  return found;
};
