import React from "react";
import ReactDOM from "react-dom/client";
import "@jetbrains/ring-ui-built/components/style.css";

import "./styles.css";
import { App } from "./app";

const host = await YTApp.register({
  onAppLocationChange: (location) => {
    const event = new CustomEvent("appLocationChange", { detail: location });
    window.dispatchEvent(event);
  }
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App host={host} />
  </React.StrictMode>
);
