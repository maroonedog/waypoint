// ===========================================================================
// issue-codes.type-test.ts — `issue.code` is a union, and which union depends
// on which resolver the form was built with.
//
// A wording function keyed on a code is worth having only if the code is
// checked. It is checked here in the direction that matters: a code the
// vendor cannot produce does not compile, so a table that outlives a rename
// fails the build instead of falling through to a branch nobody takes.
//
// TWO FORMS, TWO ANSWERS, and that is the point of reading the union off the
// REGISTRY rather than off a parameter the caller supplies. `coded` is zod's,
// so its codes are zod's. `uncoded` is registered against the generic resolver,
// whose issues have no code at all — `StandardSchemaV1.Issue` has `message`
// and `path` and nothing else — so its union is `never`, and matching on a
// code there is a compile error rather than a branch that is silently dead.
//
// The `@ts-expect-error` lines are the test. Each one fails to compile if the
// typing degrades back to `string`, because a directive with nothing to
// suppress is itself an error.
// ===========================================================================
import { z } from "zod";
import { zodFormResolver } from "@maroonedog/waypoint/resolver-zod";
import { standardFormResolver } from "@maroonedog/waypoint/resolver-standard";
import {
  useField,
  type CodesFor,
  type FormMessageFor,
} from "@maroonedog/waypoint/react";

const orderSchema = z.object({
  owner: z.object({ name: z.string().min(3), email: z.email() }),
});
const plainSchema = z.object({ nickname: z.string().min(2) });

const orderAdapter = zodFormResolver(orderSchema);
const plainAdapter = standardFormResolver(plainSchema);

declare module "@maroonedog/waypoint" {
  interface WaypointForms {
    coded: typeof orderAdapter;
    uncoded: typeof plainAdapter;
  }
}

export function Accepted(): void {
  useField("coded:owner.name", {
    messageFor: (issue, descriptor) =>
      issue.code === "too_small"
        ? `at least ${descriptor?.constraints?.minLength}`
        : undefined,
  });

  // Every code zod declares is legal, and the narrowing is real: inside the
  // branch there is nothing left for the code to be.
  useField("coded:owner.email", {
    messageFor: (issue) => {
      if (issue.code === "invalid_format") return "not an email address";
      if (issue.code === "custom") return "refused";
      return undefined;
    },
  });

  // A form the generic resolver built carries no code, so the only thing to
  // read is the message the vendor wrote.
  useField("uncoded:nickname", { messageFor: (issue) => issue.message });
}

export function Refused(): void {
  useField("coded:owner.name", {
    messageFor: (issue) =>
      // @ts-expect-error zod has no such code
      issue.code === "too_smal" ? "typo" : undefined,
  });

  // The generic resolver's code is `never`, so the property is `undefined`
  // and there is nothing to read out of it. COMPARING it to a string is not
  // what fails — TypeScript allows an always-false comparison against an
  // optional property — so the refusal worth pinning is the one a table would
  // actually hit: the code cannot be used as a string.
  useField("uncoded:nickname", {
    messageFor: (issue) => {
      // @ts-expect-error the generic resolver carries no code at all
      const key: string = issue.code;
      return key;
    },
  });
}

/**
 * The type is exported, so an application names it once for a whole table.
 *
 * IT TAKES THE FORM'S WHOLE UNION, not the two codes this one happens to
 * answer, and that is contravariance doing its job rather than a nuisance: the
 * function is HANDED every issue the form can produce, so one declared for two
 * codes could not be called with the ninth. Narrowing happens inside, and the
 * codes left over return undefined — which is what keeps the validator's own
 * sentence for them.
 */
export type ZodWording = FormMessageFor<CodesFor<"coded">>;

export const zodWording: ZodWording = (issue) =>
  issue.code === "too_small" ? "too short" : undefined;

export function Named(): void {
  useField("coded:owner.name", { messageFor: zodWording });
}
