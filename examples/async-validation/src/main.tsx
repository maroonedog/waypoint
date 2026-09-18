import { useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  FormProvider, useCreateForm, useField, useFormStatus, useErrorSummary,
} from "@maroonedog/waypoint/react";
import type { FormPathTo } from "@maroonedog/waypoint";
import { createEmailValidation, waitForQuiet } from "./email-validation.mjs";
import "../../plain.css";

declare module "@maroonedog/waypoint" {
  interface WaypointForms { signup: ReturnType<typeof createEmailValidation>["adapter"] }
}

function TextInput({ path }: { path: FormPathTo<string> }) {
  const field = useField(path);
  return <div className="field">
    <label {...field.labelProps}>{field.descriptor?.label}</label>
    <input {...field.inputProps} />
    <span {...field.errorProps} className="msg">{field.issues[0]?.message}</span>
  </div>;
}

function Signup() {
  const offline = useRef(false);
  const [isOffline, setOffline] = useState(false);
  const [requests, setRequests] = useState(0);
  const [message, setMessage] = useState("");
  const [validation] = useState(() => createEmailValidation({
    lookup: async (email, signal) => {
      setRequests(count => count + 1);
      await waitForQuiet(500, signal);
      if (offline.current) throw new Error("Simulated network failure");
      return email !== "taken@example.com";
    },
  }));
  const form = useCreateForm(() => ({
    key: "signup", adapter: validation.adapter,
    defaultValues: { email: "", name: "" }, validateOn: "blur",
  }));
  return <FormProvider form={form} showIssues="touched">
    <FormContents onSave={async () => {
      setMessage("");
      try {
        const result = await validation.submit(form, root => {
          setMessage(`Saved locally: ${JSON.stringify(root)}`);
        });
        return result.submitted;
      } catch (error) {
        setMessage(error instanceof Error && error.name === "AbortError"
          ? "The check was cancelled. Try saving again."
          : "Saving failed. Please retry.");
        return false;
      }
    }} />
    <label><input type="checkbox" checked={isOffline} onChange={event => {
      offline.current = event.target.checked;
      setOffline(event.target.checked);
    }} /> Simulate a network failure</label>
    <p>Requests started: {requests}</p>
    <p role="status">{message}</p>
  </FormProvider>;
}

function FormContents({ onSave }: { onSave: () => Promise<boolean> }) {
  const status = useFormStatus("signup");
  const summary = useErrorSummary("signup");
  return <form {...summary.scopeProps} noValidate onSubmit={async event => {
    event.preventDefault();
    if (status.isSubmitting) return;
    if (!await onSave()) summary.focusFirst();
  }}>
    <fieldset disabled={status.isSubmitting}>
      <legend>Create an account</legend>
      <TextInput path="signup:name" />
      <TextInput path="signup:email" />
      <button type="submit">{status.isSubmitting ? "Checking…" : "Save"}</button>
    </fieldset>
    <p role="status">{status.isValidating ? "Checking availability…" : ""}</p>
    <div {...summary.summaryProps} aria-label="Problems to resolve">
      {summary.entries.map(entry => <p key={entry.path}>
        <button type="button" className="quiet" onClick={entry.focus}>{entry.label ?? entry.path}</button>{" "}
        {entry.issues.map(issue => issue.message).join("; ")}
      </p>)}
    </div>
  </form>;
}

const host = document.getElementById("root");
if (!host) throw new Error("Missing root element");
createRoot(host).render(<div className="wp-example wp-page">
  <header><div><h1>Async email validation</h1><p>
    Checks run when a field loses focus. Try taken@example.com, then another address.
    After a successful check, edit your name within five seconds: the answer is reused.
    Saving always checks again. This demo uses a simulated service and saves nothing remotely.
  </p></div></header>
  <main><Signup /></main>
</div>);
