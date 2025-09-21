/**
 * ControlPanel.tsx
 *
 * Purpose: Main control interface for managing multiple display blackout overlays
 *
 * This component:
 * - Displays all available monitors with individual controls
 * - Manages global blackout state across all displays
 * - Handles keyboard shortcuts for quick access
 * - Provides visual feedback for current overlay states
 *
 * Dependencies:
 * - Uses type-safe IPC for backend communication
 * - DisplayCard component for individual display controls
 * - Global keyboard shortcut integration
 */

import { useEffect, useState } from "react";
import { DisplayCard } from "./components/DisplayCard";
import { handleIpcError, invoke, listen } from "./lib/ipc";
// Recovery functionality available but not currently used
// import { verifyAndRecoverOverlays } from "./lib/recovery";
import type { Display, DisplayState, IpcError } from "./types/ipc";
import { logger } from "./utils/logger";

export function ControlPanel() {
  const [displays, setDisplays] = useState<Display[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayStates, setDisplayStates] = useState<Map<string, DisplayState>>(
    new Map(),
  );
  const [allBlackout, setAllBlackout] = useState(false);

  useEffect(() => {
    logger.info("ControlPanel mounted, initializing...");
    // Load displays on mount
    loadDisplays();

    // Verify and recover any missing overlay windows on startup
    // TODO: Re-enable after confirming basic functionality
    // verifyAndRecoverOverlays().then((recovered) => {
    //   if (recovered.length > 0) {
    //     logger.info("Recovered overlay windows", { recovered });
    //   }
    // });

    // Listen for global shortcut events
    const unlisten1 = listen("toggle-all-displays" as const, () => {
      toggleAllDisplays();
    });

    const unlisten2 = listen("toggle-display" as const, (displayNumber) => {
      // displayNumber is 1-based (1-4 for keyboard shortcuts)
      const displayId = `display-${displayNumber}`;
      toggleDisplay(displayId);
    });

    return () => {
      unlisten1.then((fn) => fn());
      unlisten2.then((fn) => fn());
    };
  }, []); // Empty dependency array - only run once on mount

  /**
   * Load available displays from the system
   *
   * Purpose: Initialize display list and create default states for each display
   *
   * Side Effects:
   * - Updates displays state with system display information
   * - Initializes display states with default values
   * - Sets loading/error states appropriately
   */
  const loadDisplays = async () => {
    setLoading(true);
    setError(null);

    try {
      const loadedDisplays = (await invoke("GET_DISPLAYS")) as Display[];
      setDisplays(loadedDisplays);

      // Initialize display states
      const newStates = new Map<string, DisplayState>();
      for (const display of loadedDisplays) {
        newStates.set(display.id, {
          display,
          is_blackout: false,
          opacity: 80, // Default to 80% opacity
        });
      }
      setDisplayStates(newStates);
    } catch (err) {
      const errorMessage = handleIpcError(err as IpcError, {
        DISPLAY_NOT_FOUND: () => "No displays found",
        WINDOW_CREATE_FAILED: () => "Failed to access display information",
        INVALID_PARAMETER: () => "Invalid display configuration",
        UNKNOWN: (e) => e.message,
      });
      setError(errorMessage);
      console.error("Failed to load displays:", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Toggle blackout state for a specific display
   *
   * Purpose: Handle keyboard shortcut for individual display toggle
   *
   * @param displayId - ID of the display to toggle
   *
   * Side Effects:
   * - Triggers the DisplayCard's toggle button programmatically
   */
  const toggleDisplay = (displayId: string) => {
    const card = document.querySelector(`[data-display-id="${displayId}"]`);
    if (card) {
      const button = card.querySelector<HTMLButtonElement>(
        "button[data-toggle]",
      );
      button?.click();
    }
  };

  /**
   * Toggle blackout state for all displays simultaneously
   *
   * Purpose: Provide quick way to enable/disable all overlays at once
   *
   * Side Effects:
   * - Updates allBlackout state
   * - Toggles each display that doesn't match the new state
   * - Handles errors gracefully without stopping the process
   */
  const toggleAllDisplays = async () => {
    const newBlackoutState = !allBlackout;
    setAllBlackout(newBlackoutState);

    // Process all displays in parallel for better performance
    const promises = displays.map(async (display) => {
      const state = displayStates.get(display.id);
      if (state && state.is_blackout !== newBlackoutState) {
        try {
          await toggleDisplayBlackout(display, state, newBlackoutState);
        } catch (error) {
          console.error(`Failed to toggle display ${display.id}:`, error);
        }
      }
    });

    await Promise.allSettled(promises);
  };

  /**
   * Toggle blackout overlay for a specific display
   *
   * Purpose: Manage the lifecycle of overlay windows with proper error handling
   *
   * @param display - Display information
   * @param state - Current display state
   * @param blackout - Whether to show (true) or hide (false) the overlay
   *
   * Side Effects:
   * - Updates local state optimistically for better UX
   * - Creates overlay window if needed
   * - Sets opacity after window creation
   * - Reverts state on error
   */
  const toggleDisplayBlackout = async (
    display: Display,
    state: DisplayState,
    blackout: boolean,
  ) => {
    try {
      // Update state immediately for responsive UI
      handleStateChange({
        ...state,
        is_blackout: blackout,
      });

      if (blackout) {
        await invoke("CREATE_OVERLAY_FOR_DISPLAY", { displayId: display.id });

        // Toggle visibility first to ensure window is shown
        await invoke("TOGGLE_OVERLAY_VISIBILITY", {
          displayId: display.id,
          visible: blackout,
        });

        // Add a small delay to ensure the window is ready before setting opacity
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Then set initial opacity
        await invoke("SET_OVERLAY_OPACITY", {
          displayId: display.id,
          opacity: state.opacity / 100,
        });
      } else {
        // When hiding, just toggle visibility
        await invoke("TOGGLE_OVERLAY_VISIBILITY", {
          displayId: display.id,
          visible: blackout,
        });
      }
    } catch (err) {
      const errorMessage = handleIpcError(err as IpcError, {
        DISPLAY_NOT_FOUND: () => `Display ${display.id} not found`,
        WINDOW_CREATE_FAILED: () =>
          `Failed to create overlay for display ${display.name || display.id}`,
        INVALID_PARAMETER: () => "Invalid display parameters",
        UNKNOWN: (e) => e.message,
      });

      console.error("Failed to toggle display blackout:", errorMessage);

      // Revert state on error
      handleStateChange({
        ...state,
        is_blackout: !blackout,
      });

      // Show error to user (could be improved with a toast notification)
      setError(errorMessage);
      setTimeout(() => setError(null), 5000);
    }
  };

  /**
   * Update state for a specific display
   *
   * Purpose: Centralized state update to ensure consistency
   *
   * @param newState - New state for the display
   *
   * Side Effects:
   * - Updates displayStates map
   * - Triggers re-render of affected DisplayCard
   */
  const handleStateChange = (newState: DisplayState) => {
    setDisplayStates((prev) => {
      const newMap = new Map(prev);
      newMap.set(newState.display.id, newState);
      return newMap;
    });
  };

  return (
    <div
      style={{
        height: "100vh",
        backgroundColor: "#0a0a0a",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          padding: "16px",
          borderBottom: "1px solid #333",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "20px" }}>
          Blackout Display Control
        </h1>
        <button
          type="button"
          onClick={toggleAllDisplays}
          style={{
            padding: "8px 16px",
            backgroundColor: allBlackout ? "#ff4444" : "#4444ff",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          {allBlackout ? "🔴 全体解除" : "🟢 全体ON"}
        </button>
      </header>

      <main style={{ flex: 1, padding: "16px", overflowY: "auto" }}>
        {error && (
          <div
            style={{
              padding: "12px",
              marginBottom: "16px",
              backgroundColor: "#ff444455",
              borderRadius: "4px",
              border: "1px solid #ff4444",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {loading && (
          <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
            Loading displays...
          </div>
        )}

        {!loading && displays.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
            No displays detected
          </div>
        )}

        {!loading &&
          displays.map((display) => {
            const state = displayStates.get(display.id) || {
              display,
              is_blackout: false,
              opacity: 80, // Default to 80% opacity
            };

            return (
              <div key={display.id} data-display-id={display.id}>
                <DisplayCard
                  display={display}
                  state={state}
                  onStateChange={handleStateChange}
                />
              </div>
            );
          })}
      </main>

      <footer
        style={{
          padding: "16px",
          borderTop: "1px solid #333",
          fontSize: "12px",
          color: "#666",
          textAlign: "center",
        }}
      >
        <p style={{ margin: "4px 0" }}>
          ダブルクリックで解除 | Cmd/Ctrl+Shift+B で全体切替
        </p>
        <p style={{ margin: "4px 0" }}>
          Cmd/Ctrl+Alt+[1-4] で個別ディスプレイ切替
        </p>
      </footer>
    </div>
  );
}
