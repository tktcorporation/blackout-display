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
import { listen as tauriListen } from "@tauri-apps/api/event";

// Get display ID from global variable set by Rust
declare global {
  interface Window {
    __DISPLAY_ID__: string;
  }
}

export function Overlay() {
  const [opacity, setOpacity] = useState(0.8); // Default to 80% opacity
  const displayId = typeof window !== "undefined" ? window.__DISPLAY_ID__ || "unknown" : "unknown";
  
  console.log(`[Overlay] Render - displayId: ${displayId}, opacity: ${opacity}, time: ${new Date().toLocaleTimeString()}`);

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
    console.log(`[Overlay] Setting up opacity listener for display: ${displayId}`);
    
    // Try both IPC system and direct Tauri listener for debugging
    const unlisten1 = listen("opacity-update" as const, (opacityValue) => {
      // The IPC system should provide the validated opacity value directly
      console.log("[Overlay IPC] Received opacity-update with validated value:", opacityValue);
      
      if (typeof opacityValue === 'number' && opacityValue >= 0 && opacityValue <= 1) {
        console.log("[Overlay IPC] Setting opacity to:", opacityValue);
        setOpacity(opacityValue);
      } else {
        console.error("[Overlay IPC] Invalid opacity value received:", opacityValue);
      }
    });

    // Also listen directly with Tauri to bypass IPC validation
    const unlisten2 = tauriListen("opacity-update", (event) => {
      console.log("[Overlay Direct] Received raw event:", event);
      const payload = event.payload;
      
      if (typeof payload === 'number' && payload >= 0 && payload <= 1) {
        console.log("[Overlay Direct] Setting opacity to:", payload);
        setOpacity(payload);
      } else {
        console.error("[Overlay Direct] Invalid payload:", payload);
      }
    });

    // Send a ready signal to backend to request current opacity
    console.log(`[Overlay] Component mounted, ready to receive events`);

    return () => {
      unlisten1.then((fn) => fn());
      unlisten2.then((fn) => fn());
    };
  }, [displayId]);

  return (
    <>
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
      {/* Debug info - remove in production */}
      <div
        style={{
          position: "fixed",
          top: 10,
          left: 10,
          backgroundColor: "white",
          padding: "10px",
          borderRadius: "5px",
          fontSize: "12px",
          fontFamily: "monospace",
          zIndex: 10000,
          pointerEvents: "none",
        }}
      >
        <div>Display: {displayId}</div>
        <div>Opacity: {opacity.toFixed(2)}</div>
        <div>BG: rgba(0, 0, 0, {opacity})</div>
      </div>
    </>
  );
}
