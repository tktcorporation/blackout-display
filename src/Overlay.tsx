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
  const [opacity, setOpacity] = useState(0.8); // Default to 80% opacity
  const displayId = typeof window !== "undefined" ? window.__DISPLAY_ID__ || "unknown" : "unknown";
  
  console.log(`[Overlay] Initial render - displayId: ${displayId}, opacity: ${opacity}`);

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
    
    const unlisten = listen("opacity-update" as const, (event) => {
      // opacity-update now sends just the opacity value directly
      console.log("[Overlay] Received opacity-update event:", event);
      console.log("[Overlay] Event payload:", (event as any).payload);
      
      // Try to get the opacity value from different possible locations
      const opacityValue = typeof event === 'number' 
        ? event 
        : (event as any).payload;
        
      console.log("[Overlay] Setting opacity to:", opacityValue);
      setOpacity(opacityValue);
    });

    // Send a ready signal to backend to request current opacity
    console.log(`[Overlay] Component mounted, ready to receive events`);

    return () => {
      unlisten.then((fn) => fn());
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
