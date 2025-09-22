/**
 * recovery.ts
 *
 * Purpose: Provide recovery utilities for overlay window management
 *
 * This module helps recover from:
 * - Missing overlay windows
 * - Inconsistent state
 * - Failed operations
 *
 * Dependencies:
 * - Type-safe IPC communication with backend
 */

import type { OverlayState } from "../types/ipc";
import { invoke } from "./ipc";

/**
 * Verify and recover any missing overlay windows
 *
 * Purpose: Check if overlay windows exist and recreate them if needed
 *
 * @returns List of display IDs that were recovered
 */
export async function verifyAndRecoverOverlays(): Promise<string[]> {
  try {
    return (await invoke("VERIFY_AND_RECOVER_OVERLAYS")) as string[];
  } catch (error) {
    console.error("Failed to verify and recover overlays:", error);
    return [];
  }
}

/**
 * Get the current state of all overlays
 *
 * Purpose: Retrieve comprehensive state information for debugging
 *
 * @returns Array of overlay states with window existence status
 */
export async function getOverlayStates(): Promise<OverlayState[]> {
  try {
    const states = (await invoke("GET_OVERLAY_STATES")) as OverlayState[];
    return states;
  } catch (error) {
    console.error("Failed to get overlay states:", error);
    return [];
  }
}

/**
 * Clean up orphaned overlay states
 *
 * Purpose: Remove states for windows that no longer exist
 *
 * @returns List of cleaned display IDs
 */
export async function cleanupOrphanedStates(): Promise<string[]> {
  try {
    return (await invoke("CLEANUP_ORPHANED_STATES")) as string[];
  } catch (error) {
    console.error("Failed to cleanup orphaned states:", error);
    return [];
  }
}

/**
 * Force recreate an overlay window
 *
 * Purpose: Completely recreate a problematic overlay window
 *
 * @param displayId - ID of the display to recreate overlay for
 */
export async function forceRecreateOverlay(displayId: string): Promise<void> {
  try {
    await invoke("FORCE_RECREATE_OVERLAY", { displayId });
  } catch (error) {
    console.error(
      `Failed to force recreate overlay for display ${displayId}:`,
      error,
    );
    throw error;
  }
}

/**
 * Perform a full recovery check
 *
 * Purpose: Run all recovery operations in sequence
 *
 * @returns Summary of recovery operations
 */
export async function performFullRecovery(): Promise<{
  recovered: string[];
  cleaned: string[];
  states: OverlayState[];
}> {
  const recovered = await verifyAndRecoverOverlays();
  const cleaned = await cleanupOrphanedStates();
  const states = await getOverlayStates();

  return { recovered, cleaned, states };
}
