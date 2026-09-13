import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SignupForm } from "./signup-form.js";
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
        <h1>Server errors, and what drops them</h1>
        <p>
          Two kinds of complaint reach the same list: the ones a schema can
          make with the value in front of it, and the ones only a server can
          make. One of the server&rsquo;s lands on a field; the other lands on
          a path no input draws, and still refuses the submit.
        </p>
      </div>
    </header>
    <main>
      <SignupForm />
    </main>
    </div>
  </StrictMode>
);
