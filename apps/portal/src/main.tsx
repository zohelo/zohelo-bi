import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TplApp } from "./tpl/TplApp";
import "@fontsource-variable/inter";
import "@fontsource-variable/inter-tight";
import "@zohelo/design-template/tokens.css";
import "@zohelo/design-template/zt.css";
import "./tpl/shell.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div className="zt">
      <TplApp />
    </div>
  </StrictMode>,
);
