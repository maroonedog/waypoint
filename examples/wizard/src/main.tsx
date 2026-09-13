import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BookingWizard } from "./booking-wizard.js";
import "../../plain.css";

const host = document.getElementById("root");
if (host === null) throw new Error("The page has no #root element.");

createRoot(host).render(
  // `wp-example` is the scope the stylesheet needs — it used to style `body`
  // and `section` directly, which is fatal once these components are one
  // block on the documentation site, where they also run. `wp-page` is the
  // half that is only true HERE: on its own port the example is the whole
  // page, so its ground reaches the bottom of the viewport.
  <StrictMode>
    <div className="wp-example wp-page">
    <header>
      <div>
        <h1>One form, three screens</h1>
        <p>
          Type something on step 1, go to step 3, come back. Nothing was
          lifted, merged or stored per step: every declared path was written
          before any component existed, so a screen you have not opened already
          holds its values — and already blocks the submit.
        </p>
      </div>
    </header>
    <main>
      <BookingWizard />
    </main>
    </div>
  </StrictMode>
);
