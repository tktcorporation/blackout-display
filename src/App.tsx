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
import { useEffect, useRef } from "react";
import { ControlPanel } from "./ControlPanel";
import { Overlay } from "./Overlay";
import "./App.css";

function App() {
  const windowRef = useRef(getCurrentWebviewWindow());
  const isOverlay = windowRef.current.label.startsWith("overlay-");

  useEffect(() => {
    /**
     * Show the window after app loads
     *
     * Purpose: Prevent white flash by showing window only after React renders
     *
     * Side Effects:
     * - Makes the window visible to the user
     */
    const showWindow = async () => {
      try {
        await windowRef.current.show();
      } catch (error) {
        console.error("Failed to show window:", error);
      }
    };

    showWindow();
  }, []);

  // Render different components based on window type
  return isOverlay ? <Overlay /> : <ControlPanel />;
}

export default App;
