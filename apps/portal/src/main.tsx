import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TplApp } from "./tpl/TplApp";
import { legacyRedirect } from "./tpl/legacy";
import "@fontsource-variable/inter";
import "@fontsource-variable/inter-tight";
import "@zohelo/design-template/tokens.css";
import "@zohelo/design-template/zt.css";
import "./tpl/shell.css";

// An old-portal address (bookmark or link from before the template) becomes its template equivalent before
// the first render.
const legacy = legacyRedirect(new URL(window.location.href), import.meta.env.VITE_DATA_MODE === "dummy");
if (legacy) window.history.replaceState(null, "", legacy + window.location.hash);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div className="zt">
      <TplApp />
    </div>
  </StrictMode>,
);
