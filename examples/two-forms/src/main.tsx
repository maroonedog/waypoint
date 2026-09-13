import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AdminScreen, CustomerScreen } from "./screens.js";
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
        <h1>Two forms, one page, one set of inputs</h1>
        <p>
          Both forms declare <code>owner.email</code> and mean different things
          by it. The two inputs below are the <em>same component</em>, which
          imports neither schema and takes one prop — an address that names its
          own form.
        </p>
      </div>
    </header>
    <main>
      <CustomerScreen />
      <AdminScreen />
    </main>
    </div>
  </StrictMode>
);
