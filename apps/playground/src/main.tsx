import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@notsho/tokens/tokens.css";
import "@notsho/customizer/styles.css";
import "./playground.css";
import { ThemeProvider } from "@notsho/theme";
import { Toaster } from "@notsho/registry/toast";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <Toaster timeout={30000}>
        <App />
      </Toaster>
    </ThemeProvider>
  </StrictMode>,
);
