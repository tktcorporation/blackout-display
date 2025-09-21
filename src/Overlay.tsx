/**
 * Overlay.tsx
 *
 * Purpose: Fullscreen black overlay component for display blackout
 *
 * This component creates a non-interactive black overlay that:
 * - Covers the entire screen
 * - Adjusts opacity based on backend events
 * - Allows click-through to underlying applications
 *
 * Dependencies:
 * - Receives opacity updates via IPC events
 * - Runs in a separate window per display
 */

import { useEffect, useState } from "react";
import { listen } from "./lib/ipc";

// Get display ID from global variable set by Rust
declare global {
  interface Window {
    __DISPLAY_ID__: string;
  }
}

export function Overlay() {
  const [opacity, setOpacity] = useState(0.5);
  // Display ID is available from window.__DISPLAY_ID__ if needed
  // const displayId = typeof window !== "undefined" ? window.__DISPLAY_ID__ || null : null;

  useEffect(() => {
    /**
     * Listen for opacity updates from the control panel
     *
     * Purpose: Allow real-time opacity adjustment without recreating the window
     *
     * Side Effects:
     * - Updates local opacity state
     * - Re-renders overlay with new opacity
     */
    const unlisten = listen("opacity-update" as const, (opacityValue) => {
      // opacity-update now sends just the opacity value directly
      console.log("Received opacity update:", opacityValue);
      setOpacity(opacityValue);
    });

    // Display ID is set by Rust when creating the window

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: `rgba(0, 0, 0, ${opacity})`,
        cursor: "default",
        userSelect: "none",
        pointerEvents: "none",
        zIndex: 9999,
      }}
    />
  );
}
