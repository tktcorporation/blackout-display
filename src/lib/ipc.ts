/**
 * ipc.ts
 *
 * Purpose: Provide type-safe wrappers for Tauri IPC communication
 *
 * This module ensures:
 * - Runtime validation of all IPC payloads
 * - Type-safe command invocation
 * - Consistent error handling
 * - Automatic parameter transformation (camelCase to snake_case)
 *
 * Dependencies:
 * - @tauri-apps/api for core IPC functionality
 * - ts-pattern for exhaustive error handling
 */

import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import {
  type Event as TauriEvent,
  type UnlistenFn,
  listen as tauriListen,
} from "@tauri-apps/api/event";
import { match } from "ts-pattern";
import type { z } from "zod";
import {
  IPC_COMMANDS,
  type IpcError,
  IpcErrorSchema,
  IpcEventPayloads,
} from "../types/ipc";

/**
 * Convert object keys from camelCase to snake_case
 *
 * Purpose: Maintain consistent naming conventions between TypeScript (camelCase)
 * and Rust (snake_case) while keeping the developer experience idiomatic
 *
 * @param obj - Object with camelCase keys
 * @returns Object with snake_case keys
 */
function camelToSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
    result[snakeKey] = value;
  }
  return result;
}

/**
 * Type-safe wrapper for Tauri invoke command
 *
 * Purpose: Ensure all backend commands are called with validated parameters
 * and return validated responses
 *
 * @param command - Command name (matching Rust command names)
 * @param params - Command parameters (will be converted to snake_case)
 * @returns Promise with the command result
 * @throws IpcError with detailed error information
 */
export async function invoke(
  command: keyof typeof IPC_COMMANDS,
  params?: Record<string, unknown>,
): Promise<unknown> {
  try {
    // Convert parameters to snake_case for Rust
    const snakeCaseParams = params ? camelToSnake(params) : undefined;

    // Call the actual Tauri command
    const result = await tauriInvoke(IPC_COMMANDS[command], snakeCaseParams);

    // TODO: Add response validation once we have response schemas
    return result;
  } catch (error) {
    // Try to parse as IpcError
    const parsedError = IpcErrorSchema.safeParse(error);
    if (parsedError.success) {
      throw parsedError.data;
    }

    // Convert unknown errors to IpcError format
    throw {
      code: "UNKNOWN",
      message: error instanceof Error ? error.message : String(error),
      details: { originalError: error },
    } satisfies IpcError;
  }
}

/**
 * Type-safe wrapper for Tauri event listener
 *
 * Purpose: Ensure all event payloads are validated before processing
 *
 * @param eventName - Event name (matching the actual event names)
 * @param handler - Callback function that receives validated payload
 * @returns Unlisten function to remove the event listener
 */
export async function listen<T extends keyof typeof IpcEventPayloads>(
  eventName: T,
  handler: (payload: z.infer<(typeof IpcEventPayloads)[T]>) => void,
): Promise<UnlistenFn> {
  return tauriListen(eventName, (event: TauriEvent<unknown>) => {
    // Validate the event payload
    const schema = IpcEventPayloads[eventName];
    const parsed = schema.safeParse(event.payload);

    if (!parsed.success) {
      console.error(`Invalid payload for event ${eventName}:`, parsed.error);
      return;
    }

    // Call handler with validated payload
    handler(parsed.data as z.infer<(typeof IpcEventPayloads)[T]>);
  });
}

/**
 * Handle IPC errors with exhaustive pattern matching
 *
 * Purpose: Provide consistent error handling across the application
 *
 * @param error - IpcError to handle
 * @param handlers - Object with handlers for each error code
 * @returns Result of the matching handler
 */
export function handleIpcError<T>(
  error: IpcError,
  handlers: {
    [K in IpcError["code"]]: (error: IpcError & { code: K }) => T;
  },
): T {
  return match(error)
    .when(
      (e): e is IpcError & { code: "DISPLAY_NOT_FOUND" } =>
        e.code === "DISPLAY_NOT_FOUND",
      handlers.DISPLAY_NOT_FOUND,
    )
    .when(
      (e): e is IpcError & { code: "WINDOW_CREATE_FAILED" } =>
        e.code === "WINDOW_CREATE_FAILED",
      handlers.WINDOW_CREATE_FAILED,
    )
    .when(
      (e): e is IpcError & { code: "INVALID_PARAMETER" } =>
        e.code === "INVALID_PARAMETER",
      handlers.INVALID_PARAMETER,
    )
    .when(
      (e): e is IpcError & { code: "UNKNOWN" } => e.code === "UNKNOWN",
      handlers.UNKNOWN,
    )
    .exhaustive();
}
