/**
 * App.tsx
 *
 * Purpose: Root component that determines which UI to render based on window type
 *
 * This component:
 * - Detects if running in main window or overlay window
 * - Shows control panel for main window
 * - Shows black overlay for overlay windows
 * - Handles initial window visibility
 *
 * Dependencies:
 * - Tauri window API for window identification
 * - ControlPanel and Overlay components
 */

import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useRef } from "react";
import { ControlPanel } from "./ControlPanel";
import { Overlay } from "./Overlay";
import "./App.css";

function App() {
  const windowRef = useRef(getCurrentWebviewWindow());
  const isOverlay = windowRef.current.label.startsWith("overlay-");

  // Note: Window visibility is managed by the backend
  // - Main window is shown in src-tauri/src/lib.rs after setup
  // - Overlay windows are shown/hidden via IPC commands

  // Render different components based on window type
  return isOverlay ? <Overlay /> : <ControlPanel />;
}

export default App;
