import { createRoot } from "react-dom/client";
import { Playground } from "./playground.js";
import "./styles.css";

const host = document.getElementById("root");
if (host === null) throw new Error("The page has no #root element.");

// No StrictMode here, deliberately. This page exists to make the render count
// legible, and StrictMode double-invokes every render in development, so every
// number on screen would be twice what it means.
createRoot(host).render(<Playground />);
