// ===========================================================================
// signup-form.tsx — one round trip, and what the answer does afterwards.
//
// The handler is where the round trip lives, and it returns nothing. What the
// server said goes into `adoptIssues`, not into a return value and not into
// component state — because a message held in state is shown but not counted
// and does not block, which is a form that displays "declined" and submits
// anyway.
//
// `adoptIssues` is called INSIDE the handler, before the submit promise
// settles. That is the arrangement the runtime is built for: the attempt in
// flight does not drop what it was just handed, and the NEXT press asks the
// server again.
//
// The log is not decoration. Each of the moments an adopted issue is dropped
// is invisible in the DOM — the message simply stops being there — so the
// example says which one happened.
// ===========================================================================
import { useState, type ReactElement } from "react";
import {
  FormProvider,
  useCreateForm,
  useErrorSummary,
  useField,
  useFormStatus,
  type FormPathTo,
} from "@maroonedog/waypoint/react";
import { signupAdapter } from "./waypoint-forms.js";
import { EMPTY_SIGNUP, type Signup } from "./schema.js";
import { createAccount } from "./fake-api.js";

/** One text input. It takes an address and nothing else. */
function Text({
  at,
  hint,
}: {
  readonly at: FormPathTo<string>;
  readonly hint?: string;
}): ReactElement {
  const field = useField(at);
  return (
    <label className="field">
      <span>{field.descriptor?.label}</span>
      <input {...field.inputProps} />
      {hint === undefined ? null : <span className="hint">{hint}</span>}
      <span className="msg" {...field.errorProps}>
        {field.issues[0]?.message ?? ""}
      </span>
    </label>
  );
}

/**
 * Everything blocking a submit, including paths no input draws. This is the
 * only place `payment` can appear, which is the point: a summary built out of
 * the field cells would have nothing to read for it.
 *
 * A MISSING LABEL IS THE TELL, and it is one only because this schema titles
 * every field it declares. The summary quotes the descriptor's label and
 * invents nothing from the path, so an entry with none is an entry the
 * descriptor tree does not know — which here is exactly the server's own.
 */
function WhatIsBlocking(): ReactElement | null {
  const summary = useErrorSummary();
  if (summary.entries.length === 0) return null;
  return (
    <div className="alert" {...summary.summaryProps}>
      <strong>{summary.entries.length} blocking</strong>
      <ul className="plain">
        {summary.entries.map((entry) => (
          <li key={entry.path}>
            <code>{entry.path}</code> — {entry.issues[0]?.message}
            {entry.label === undefined
              ? " — no field draws this path"
              : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Footer({
  press,
}: {
  readonly press: () => void;
}): ReactElement {
  const { errorCount, isSubmitting, submitCount } = useFormStatus();
  return (
    <div className="spread">
      <span className="hint">
        {errorCount === 0 ? "nothing is blocking" : `${errorCount} blocking`}
        {submitCount === 0 ? "" : ` · pressed ${submitCount}×`}
      </span>
      <button type="button" onClick={press} disabled={isSubmitting}>
        {isSubmitting ? "Asking the server…" : "Create the account"}
      </button>
    </div>
  );
}

export function SignupForm(): ReactElement {
  const form = useCreateForm(() => ({
    adapter: signupAdapter,
    defaultValues: structuredClone(EMPTY_SIGNUP),
  }));
  const [log, setLog] = useState<readonly string[]>([
    'Fill it in with handle "ada" and a card number ending in 0.',
  ]);
  const [account, setAccount] = useState<string | undefined>(undefined);

  const say = (line: string): void =>
    setLog((lines) => [...lines, line].slice(-14));

  const press = (): void => {
    setAccount(undefined);
    say("submit pressed");
    void form
      .submit(async (root) => {
        const answer = await createAccount(root as Signup);
        if (answer.ok) {
          setAccount(answer.id);
          say(`server accepted it — ${answer.id}`);
          return;
        }
        // Inside the handler, so this attempt keeps what it was just handed.
        form.adoptIssues(answer.issues);
        say(
          `server refused — adopted ${answer.issues
            .map((issue) => issue.path)
            .join(", ")}`
        );
      })
      .then((outcome) => {
        // THE FIRST PRESS IS NOT REFUSED, and saying so is the point of this
        // line. Nothing was wrong when it was pressed, so the form handed the
        // root over and the handler ran; the refusal arrived afterwards. It is
        // the NEXT press that is refused before the handler runs at all,
        // because by then the adopted issues are in every pass.
        say(
          outcome.submitted
            ? "the form handed it over — whatever came back came back after"
            : `refused before the handler ran — ${outcome.blockedBy
                .map((issue) => issue.path)
                .join(", ")}. The server's answer is dropped now that this ` +
              "attempt has been refused by it, so the next press asks again"
        );
      });
  };

  return (
    <FormProvider form={form}>
      <section>
        <h2>Open an account</h2>
        <p className="note">
          The schema judges the shape. The server judges what the schema cannot
          see, and its answer goes to <code>adoptIssues</code> — merged into
          every pass, so it is shown, counted and blocking, all off one list.
        </p>
        <WhatIsBlocking />
        {account === undefined ? null : (
          <p className="ok">Account {account} created.</p>
        )}
        <Text at="form:handle" hint="ada, grace and alan are taken" />
        <Text at="form:email" />
        <Text at="form:card.holder" />
        <Text
          at="form:card.number"
          hint="sixteen digits; one ending in 0 is declined"
        />
        <Footer press={press} />
      </section>

      <section>
        <h2>What happened</h2>
        <p className="note">
          Edit <code>handle</code> after it is refused and its message goes
          without anybody asking the server. Edit the card number and the
          decline stays — nothing you can type is <em>about</em>{" "}
          <code>payment</code>, so only the next press clears it.
        </p>
        <pre className="log">{log.join("\n")}</pre>
      </section>
    </FormProvider>
  );
}
