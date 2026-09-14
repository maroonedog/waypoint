import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PartlyByHand, SwappedTable, WholeForm } from "./screens.js";
import "../../plain.css";

const host = document.getElementById("root");
if (host === null) throw new Error("The page has no #root element.");

createRoot(host).render(
  // `wp-example` is the scope the shared stylesheet needs; `wp-page` is the
  // half that is only true here, where the example is the whole document. On
  // the documentation site these screens are one block on somebody else's
  // page, and the second class is left off.
  <StrictMode>
    <div className="wp-example wp-page">
      <header>
        <div>
          <h1>AutoForm, and how to change what it draws</h1>
          <p>
            One schema, one widget table, three screens. Nothing here is
            written per field: what each input looks like is decided by which
            rung of the table it matched, and every way of changing that is on
            this page.
          </p>
        </div>
      </header>
      <main>
        <WholeForm />
        <PartlyByHand />
        <SwappedTable />
      </main>
    </div>
  </StrictMode>
);
