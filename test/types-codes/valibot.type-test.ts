import * as v from "valibot";
import { valibotFormResolver } from "@maroonedog/waypoint/resolver-valibot";
import type { FormValues, FormPaths } from "@maroonedog/waypoint";
import { useField, type CodesFor } from "@maroonedog/waypoint/react";

const adapter = valibotFormResolver(v.object({
  email: v.pipe(v.string(), v.email()),
  age: v.pipe(v.string(), v.transform(Number)),
}), { partial: true });
declare module "@maroonedog/waypoint" {
  interface WaypointForms { valibotExample: typeof adapter }
}

export const input: FormValues<typeof adapter> = { email: "a@example.com", age: "42" };
// @ts-expect-error Forms edit input values, not transformed output.
export const output: FormValues<typeof adapter> = { email: "a@example.com", age: 42 };
export const path: FormPaths<typeof adapter> = "email";
// @ts-expect-error Unknown field paths must be rejected.
export const typo: FormPaths<typeof adapter> = "emali";
export const code: CodesFor<"valibotExample"> = "email";
// @ts-expect-error Valibot's issue type union is not an arbitrary string.
export const invented: CodesFor<"valibotExample"> = "not_a_valibot_issue";
export function Email() {
  return useField("valibotExample:email", {
    messageFor: issue => issue.code === "email" ? "Invalid email" : undefined,
  });
}
const asyncSchema = v.objectAsync({ email: v.string() });
// @ts-expect-error The JSON Schema converter does not accept async schemas.
valibotFormResolver(asyncSchema);
valibotFormResolver(asyncSchema, { fields: adapter.fields, partial: true });
// @ts-expect-error Collecting all issues is required by the form contract.
valibotFormResolver(v.object({ name: v.string() }), { validation: { abortEarly: true } });
