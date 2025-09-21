/**
 * DisplayCard.tsx
 *
 * Purpose: Individual display control card with opacity adjustment
 *
 * This component allows users to:
 * - Toggle blackout overlay for a specific display
 * - Adjust overlay opacity in real-time
 * - View display information (resolution, scale, primary status)
 *
 * Dependencies:
 * - Type-safe IPC communication with backend
 * - Parent component for state management
 */

import type React from "react";
import { useState } from "react";
import { handleIpcError, invoke } from "../lib/ipc";
import type { Display, DisplayState, IpcError } from "../types/ipc";

interface DisplayCardProps {
  display: Display;
  state: DisplayState;
  onStateChange: (state: DisplayState) => void;
}

export const DisplayCard: React.FC<DisplayCardProps> = ({
  display,
  state,
  onStateChange,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  /**
   * Toggle the blackout overlay for this display
   *
   * Purpose: Handles the complete lifecycle of showing/hiding overlay
   * including window creation and opacity setting
   *
   * Side Effects:
   * - Updates UI state optimistically for responsiveness
   * - Creates overlay window if enabling blackout
   * - Sets initial opacity when creating overlay
   * - Reverts state if any operation fails
   */
  const toggleBlackout = async () => {
    if (isUpdating) return; // Prevent double-clicks

    const newState = !state.is_blackout;
    setIsUpdating(true);

    try {
      // Update state immediately to enable/disable controls
      onStateChange({
        ...state,
        is_blackout: newState,
      });

      if (newState) {
        await invoke("CREATE_OVERLAY_FOR_DISPLAY", { displayId: display.id });

        // Toggle visibility first to ensure window is shown
        await invoke("TOGGLE_OVERLAY_VISIBILITY", {
          displayId: display.id,
          visible: newState,
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
          visible: newState,
        });
      }
    } catch (err) {
      const errorMessage = handleIpcError(err as IpcError, {
        DISPLAY_NOT_FOUND: () => "Display no longer available",
        WINDOW_CREATE_FAILED: () => "Failed to create overlay window",
        INVALID_PARAMETER: () => "Invalid display parameters",
        UNKNOWN: (e) => e.message,
      });

      console.error("Failed to toggle blackout:", errorMessage);

      // Revert state on error
      onStateChange({
        ...state,
        is_blackout: !newState,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Update overlay opacity in real-time
   *
   * Purpose: Provides smooth opacity adjustment without debouncing
   * for immediate visual feedback
   *
   * @param opacity - Opacity value from 0-100
   *
   * Side Effects:
   * - Sends opacity update to backend
   * - Updates local state
   * - Logs errors but doesn't revert (to avoid jarring UX)
   */
  const handleOpacityChange = async (opacity: number) => {
    try {
      // Update local state first for immediate UI response
      onStateChange({
        ...state,
        opacity,
      });

      await invoke("SET_OVERLAY_OPACITY", {
        displayId: display.id,
        opacity: opacity / 100,
      });
    } catch (err) {
      const errorMessage = handleIpcError(err as IpcError, {
        DISPLAY_NOT_FOUND: () => "Display no longer available",
        WINDOW_CREATE_FAILED: () => "Overlay window not found",
        INVALID_PARAMETER: () => `Invalid opacity value: ${opacity}`,
        UNKNOWN: (e) => e.message,
      });

      console.error("Failed to set opacity:", errorMessage);
      // Don't revert state - let user try again
    }
  };

  return (
    <div
      style={{
        padding: "16px",
        margin: "8px",
        border: "1px solid #333",
        borderRadius: "8px",
        backgroundColor: "#1a1a1a",
        display: "flex",
        alignItems: "center",
        gap: "16px",
      }}
    >
      <div style={{ flex: 1 }}>
        <h3 style={{ margin: "0 0 8px 0", color: "#fff" }}>
          {display.name || `Display ${display.id}`}
          {display.is_primary && (
            <span
              style={{ marginLeft: "8px", fontSize: "12px", color: "#888" }}
            >
              (Primary)
            </span>
          )}
        </h3>
        <div style={{ fontSize: "12px", color: "#888" }}>
          {display.width} × {display.height} @{" "}
          {Math.round(display.scale_factor * 100)}%
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "#888", fontSize: "14px" }}>暗さ:</span>
          <input
            type="range"
            min="0"
            max="100"
            value={state.opacity}
            onChange={(e) => handleOpacityChange(Number(e.target.value))}
            disabled={!state.is_blackout}
            style={{ width: "100px" }}
          />
          <span style={{ color: "#fff", fontSize: "14px", minWidth: "40px" }}>
            {state.opacity}%
          </span>
        </div>

        <button
          type="button"
          data-toggle
          onClick={toggleBlackout}
          disabled={isUpdating}
          style={{
            padding: "8px 16px",
            backgroundColor: state.is_blackout ? "#ff4444" : "#4444ff",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: isUpdating ? "wait" : "pointer",
            minWidth: "80px",
            opacity: isUpdating ? 0.6 : 1,
            transition: "opacity 0.2s",
          }}
        >
          {isUpdating ? "..." : state.is_blackout ? "解除" : "暗くする"}
        </button>
      </div>
    </div>
  );
};
