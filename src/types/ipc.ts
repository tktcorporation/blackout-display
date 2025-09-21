/**
 * ipc.ts
 *
 * Purpose: Define type-safe IPC (Inter-Process Communication) interfaces between frontend and backend
 *
 * This file provides:
 * - Type definitions for all IPC commands and events
 * - Zod schemas for runtime validation
 * - Type-safe wrappers for Tauri invoke and listen functions
 *
 * Dependencies:
 * - zod for runtime validation
 * - @tauri-apps/api for IPC communication
 */

import { z } from "zod";

// Display information schema - Updated to match Rust struct
export const DisplaySchema = z.object({
  id: z.string(), // Changed from number to string to match Rust
  name: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  is_primary: z.boolean(),
  scale_factor: z.number(),
});

export type Display = z.infer<typeof DisplaySchema>;

// Display state schema for UI
export const DisplayStateSchema = z.object({
  display: DisplaySchema,
  is_blackout: z.boolean(),
  opacity: z.number().min(0).max(100),
});

export type DisplayState = z.infer<typeof DisplayStateSchema>;

// Overlay state schema
export const OverlayStateSchema = z.object({
  display_id: z.string(),
  is_visible: z.boolean(),
  opacity: z.number().min(0).max(1),
  is_click_through: z.boolean(),
  window_exists: z.boolean().optional(),
});

export type OverlayState = z.infer<typeof OverlayStateSchema>;

// IPC Events - Frontend event payloads
export const IpcEventPayloads = {
  "toggle-all-displays": z.void(),
  "toggle-display": z.number(), // display number (1-4)
  "opacity-update": z.number().min(0).max(1), // just opacity value
} as const;

// Command names as constants - matching Rust command names exactly
export const IPC_COMMANDS = {
  GET_DISPLAYS: "get_displays",
  CREATE_OVERLAY_FOR_DISPLAY: "create_overlay_for_display",
  TOGGLE_OVERLAY_VISIBILITY: "toggle_overlay_visibility",
  SET_OVERLAY_OPACITY: "set_overlay_opacity",
  VERIFY_AND_RECOVER_OVERLAYS: "verify_and_recover_overlays",
  GET_OVERLAY_STATES: "get_overlay_states",
  CLEANUP_ORPHANED_STATES: "cleanup_orphaned_states",
  FORCE_RECREATE_OVERLAY: "force_recreate_overlay",
} as const;

// Error types
export const IpcErrorSchema = z.object({
  code: z.enum([
    "DISPLAY_NOT_FOUND",
    "WINDOW_CREATE_FAILED",
    "INVALID_PARAMETER",
    "UNKNOWN",
  ]),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export type IpcError = z.infer<typeof IpcErrorSchema>;
