import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@notsho/tokens/tokens.css";
import "@notsho/customizer/styles.css";
import "./playground.css";
import { ThemeProvider } from "@notsho/theme";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
