import React from "react";
import { createRoot } from "react-dom/client";
import AuthGate from "./AuthGate";
import { ConfirmHost } from "./components";
import { applyColorMode, colorMode } from "./theme";
import "./styles.css";

applyColorMode();
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (colorMode() === "system") applyColorMode();
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthGate />
    <ConfirmHost />
  </React.StrictMode>,
);
