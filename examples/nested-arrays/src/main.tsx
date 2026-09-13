import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WithWaypoint } from "./with-waypoint.js";
import { WithReactHookForm } from "./with-react-hook-form.js";
import { WithFormik } from "./with-formik.js";
import { WithTanStack } from "./with-tanstack.js";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <header>
      <h1>Arrays and nesting, in one form</h1>
      <p>
        shipments[] → address{"{}"} → lines[]. One schema, one set of markup
        and one set of controls, built four times. The only thing that differs
        is how a field says which row it belongs to.
      </p>
    </header>
    <main>
      <WithWaypoint />
      <WithReactHookForm />
      <WithFormik />
      <WithTanStack />
    </main>
  </StrictMode>
);
