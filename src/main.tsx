/**
 * main.tsx
 *
 * Purpose: Application entry point that bootstraps the React application
 *
 * This file:
 * - Mounts the React app to the DOM
 * - Enables React.StrictMode for development warnings
 * - Serves as the entry point for both main and overlay windows
 *
 * Dependencies:
 * - React and ReactDOM for rendering
 * - App component that handles window-specific rendering
 */

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { installGlobalErrorHandlers } from "./utils/logger";

// Install global error handlers for dev3000 integration
installGlobalErrorHandlers();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
