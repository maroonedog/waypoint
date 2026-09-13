// ===========================================================================
// booking-wizard.tsx — one form, three screens, and two things that would
// otherwise be wrong.
//
// THE VALUES OF A STEP NOBODY HAS REACHED ARE ALREADY THERE. Every declared
// path is seeded at `createForm`, before any component exists, so stepping
// forward mounts components onto cells that were already correct and stepping
// back does not lose a thing. Nothing here lifts state, and there is no
// per-step store to merge at the end.
//
// SO WHY IS `partial` HERE. Because a provider asks, once its subtree has
// mounted, whether every declared field reached a component — and on step 1
// the answer is honestly no. The runtime cannot tell "the next step" from "the
// field somebody forgot": both are declared and both are absent. Only this
// screen knows which, so it says so. Without it every wizard would be told, on
// every first paint, about the fields it is about to show.
//
// AND WHY `useParticipation` IS NOT USED FOR THAT. It is a different question
// with a different answer. `partial` silences a report; participation changes
// what BLOCKS. A wizard wants step 3 to block the final submit even while
// nobody has seen it, so its subtree must stay in play — and it does. What
// `Next` does instead is ask about the step in front of it, which is what
// `blockedBy` filtered by prefix is for.
// ===========================================================================
import { useState, type ReactElement } from "react";
import {
  FormProvider,
  useCreateForm,
  useField,
  useFormStatus,
  useFormHandle,
  type FormPathTo,
} from "@maroonedog/waypoint/react";
import { bookingAdapter } from "./waypoint-forms.js";
import { EMPTY_BOOKING } from "./schema.js";

const STEPS = [
  { key: "traveller", title: "Who is travelling" },
  { key: "trip", title: "The trip" },
  { key: "payment", title: "Paying for it" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

function Text({
  at,
  label,
}: {
  readonly at: FormPathTo<string>;
  readonly label: string;
}): ReactElement {
  const field = useField(at);
  return (
    <label className="field">
      <span>{label}</span>
      <input {...field.inputProps} />
      <span className="msg" {...field.errorProps}>
        {field.issues[0]?.message ?? ""}
      </span>
    </label>
  );
}

function Num({
  at,
  label,
}: {
  readonly at: FormPathTo<number>;
  readonly label: string;
}): ReactElement {
  const field = useField(at);
  return (
    <label className="field">
      <span>{label}</span>
      <input {...field.inputProps} />
      <span className="msg" {...field.errorProps}>
        {field.issues[0]?.message ?? ""}
      </span>
    </label>
  );
}

function StepFields({ step }: { readonly step: StepKey }): ReactElement {
  if (step === "traveller") {
    return (
      <>
        <Text at="form:traveller.name" label="Name" />
        <Text at="form:traveller.email" label="Email" />
      </>
    );
  }
  if (step === "trip") {
    return (
      <>
        <Text at="form:trip.from" label="From" />
        <Text at="form:trip.to" label="To" />
        <Num at="form:trip.nights" label="Nights" />
      </>
    );
  }
  return (
    <>
      <Text at="form:payment.holder" label="Name on the card" />
      <Text at="form:payment.number" label="Card number" />
    </>
  );
}

/**
 * What blocks on THIS step, taken from the same list the submit is refused by
 * rather than from a second idea of what is wrong. `blockedBy` carries every
 * issue including the ones on steps nobody has opened, so filtering by prefix
 * is how a step asks about itself.
 */
function StepFooter({
  step,
  at,
  go,
}: {
  readonly step: StepKey;
  readonly at: number;
  readonly go: (to: number) => void;
}): ReactElement {
  const form = useFormHandle();
  const { errorCount } = useFormStatus();
  const [blockedHere, setBlockedHere] = useState<number | undefined>(undefined);

  const next = (): void => {
    void Promise.resolve(form.validate()).then((issues) => {
      const here = issues.filter((issue) => issue.path.startsWith(`${step}.`));
      setBlockedHere(here.length);
      if (here.length === 0) go(at + 1);
    });
  };

  return (
    <>
      {blockedHere === undefined || blockedHere === 0 ? null : (
        <p className="alert">
          {blockedHere} field(s) on this step still need a look.
        </p>
      )}
      <div className="spread">
        <span className="hint">
          {errorCount} blocking across the whole form — including the steps you
          have not opened
        </span>
        <div className="row">
          {at === 0 ? null : (
            <button type="button" className="quiet" onClick={() => go(at - 1)}>
              Back
            </button>
          )}
          {at === STEPS.length - 1 ? null : (
            <button type="button" onClick={next}>
              Next
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function Review(): ReactElement {
  const form = useFormHandle();
  const { errorCount, isSubmitting } = useFormStatus();
  const [done, setDone] = useState<string | undefined>(undefined);
  const [refused, setRefused] = useState<readonly string[]>([]);

  const send = (): void => {
    void form
      .submit(() => {
        setDone("Booked.");
      })
      .then((outcome) => {
        setRefused(
          outcome.submitted ? [] : outcome.blockedBy.map((issue) => issue.path)
        );
      });
  };

  return (
    <section>
      <h2>Send it</h2>
      <p className="note">
        The submit judges the whole root, so a step nobody opened is judged
        too — a wizard that submits because the offending field was on another
        screen is the defect this prevents.
      </p>
      {refused.length === 0 ? null : (
        <p className="alert">Refused: {refused.join(", ")}</p>
      )}
      {done === undefined ? null : <p className="ok">{done}</p>}
      <div className="spread">
        <span className="hint">{errorCount} blocking</span>
        <button type="button" onClick={send} disabled={isSubmitting}>
          Book it
        </button>
      </div>
    </section>
  );
}

export function BookingWizard(): ReactElement {
  const form = useCreateForm(() => ({
    adapter: bookingAdapter,
    defaultValues: structuredClone(EMPTY_BOOKING),
  }));
  const [at, setAt] = useState(0);
  const step = STEPS[at] ?? STEPS[0];

  return (
    // `partial`: this subtree draws one step on purpose. See the header.
    <FormProvider form={form} partial>
      <div className="steps">
        {STEPS.map((one, index) => (
          <button
            key={one.key}
            type="button"
            aria-current={index === at ? "step" : undefined}
            onClick={() => setAt(index)}
          >
            {index + 1}. {one.title}
          </button>
        ))}
      </div>
      <section>
        <h2>{step.title}</h2>
        <StepFields step={step.key} />
        <StepFooter step={step.key} at={at} go={setAt} />
      </section>
      <Review />
    </FormProvider>
  );
}
