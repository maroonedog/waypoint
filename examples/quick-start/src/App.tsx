import { useState } from "react";
import { z } from "zod";
import { zodFormResolver } from "@maroonedog/waypoint/resolver-zod";
import { FormProvider, useCreateForm, useField } from "@maroonedog/waypoint/react";

const schema = z.object({
  email: z.email("Enter a valid email address"),
});
const adapter = zodFormResolver(schema);

declare module "@maroonedog/waypoint" {
  interface WaypointForms { quickStart: typeof adapter }
}

function EmailField() {
  const field = useField("quickStart:email");
  return <p>
    <label {...field.labelProps}>Email</label>
    <input {...field.inputProps} />
    <span {...field.errorProps}>{field.issues[0]?.message}</span>
  </p>;
}

export function App() {
  const form = useCreateForm(() => ({ adapter, key: "quickStart", defaultValues: { email: "" } }));
  const [saved, setSaved] = useState("");
  return <main>
    <p>WAYPOINT / QUICK START</p>
    <h1>Your first form.</h1>
    <p>Try an invalid address, then save a valid one. This demo keeps the result on this page; it sends no request.</p>
    <FormProvider form={form}>
      <form noValidate onSubmit={async (event) => {
        event.preventDefault();
        setSaved("");
        await form.submit((values) => { setSaved(schema.parse(values).email); });
      }}>
        <EmailField />
        <button type="submit">Save</button>
      </form>
    </FormProvider>
    <p role="status">{saved ? `Saved: ${saved}` : "Nothing saved yet."}</p>
  </main>;
}
