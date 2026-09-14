// ===========================================================================
// PlainExamples.tsx — the three unstyled examples, running on this page.
//
// THE EXAMPLES THEMSELVES, not copies. Each import below reaches into
// `examples/`, so what a reader types into here is built from the files the
// `npm run example:*` commands serve and `npm run test:types` compiles. A copy
// would drift, and nothing compares two React trees.
//
// `.wp-example` IS WHY THIS FILE EXISTS AT ALL. Those examples were written as
// whole pages: their stylesheet styled `body`, `header` and `section`, which
// is right for a document that is nothing but the example and fatal the moment
// it is a component on somebody else's page. The stylesheet is scoped to that
// class now, and this is where the class goes.
//
// WHAT EACH REGISTERS IS DIFFERENT, and had to become so. This site's own
// demos register `form` and the showcase registers `application`; two of these
// three also said `form`, and an augmentation belongs to the COMPILATION, so
// they would have merged with it silently. They are `signup` and `booking`
// now, and `two-forms` already had two names of its own — so this page is a
// program with six registered forms, which is what qualified paths are for.
//
// The header each example draws on its own page is NOT drawn here: the page
// already has a heading, and a second one inside the frame would be a document
// pretending to be a section of another document.
// ===========================================================================
import { useState, type ReactElement } from "react";
import "../../../examples/plain.css";
import { SignupForm } from "../../../examples/server-errors/src/signup-form.js";
import {
  AdminScreen,
  CustomerScreen,
} from "../../../examples/two-forms/src/screens.js";
import { BookingWizard } from "../../../examples/wizard/src/booking-wizard.js";
import {
  PartlyByHand,
  SwappedTable,
  WholeForm,
} from "../../../examples/auto-form/src/screens.js";

/** The scope the shared stylesheet needs, and a frame to sit in. */
function Frame({ children }: { children: ReactElement }): ReactElement {
  return (
    <div className="wp-example rounded-lg border border-outline-variant p-4 sm:p-6">
      {children}
    </div>
  );
}

export function ServerErrorsExample(): ReactElement {
  return (
    <Frame>
      <SignupForm />
    </Frame>
  );
}

export function TwoFormsExample(): ReactElement {
  return (
    <Frame>
      <>
        <CustomerScreen />
        <AdminScreen />
      </>
    </Frame>
  );
}

// THREE SCREENS IN ONE FRAME, because they are one argument: this is what
// layer 1 draws, this is how you take a field back, and this is the table
// being the design. Split across three frames a reader would meet them as
// three examples and would have to be told they share a schema.
export function AutoFormExample(): ReactElement {
  return (
    <Frame>
      <>
        <WholeForm />
        <PartlyByHand />
        <SwappedTable />
      </>
    </Frame>
  );
}

export function WizardExample(): ReactElement {
  // The wizard's own page has nothing else on it, so it never needed to be
  // reset. Here it sits above two more examples and below a page of prose, and
  // a reader who filled it in on the way past should be able to start over.
  const [run, setRun] = useState(0);
  return (
    <Frame>
      <>
        <BookingWizard key={run} />
        <p style={{ margin: 0 }}>
          <button type="button" className="quiet" onClick={() => setRun(run + 1)}>
            Start it again
          </button>
        </p>
      </>
    </Frame>
  );
}
