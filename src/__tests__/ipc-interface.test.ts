/**
 * ipc-interface.test.ts
 *
 * Purpose: Validate IPC interface consistency between TypeScript and Rust
 *
 * This test ensures:
 * - All TypeScript IPC commands are implemented in Rust
 * - Parameter names and types match between languages
 * - No commands are missing on either side
 *
 * Dependencies:
 * - Rust-generated ipc_metadata.json
 * - TypeScript IPC definitions
 */

import fs from "node:fs/promises";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { IPC_COMMANDS, IpcEventPayloads } from "../types/ipc";

interface RustCommandMetadata {
  params: Array<{
    name: string;
    type: string;
    camelCase: boolean;
  }>;
  returns: string;
}

interface RustMetadata {
  commands: Record<string, RustCommandMetadata>;
  events: Record<string, { payload: string }>;
}

describe("IPC Interface Validation", () => {
  let rustMetadata: RustMetadata;

  beforeAll(async () => {
    // Load Rust-generated metadata
    const metadataPath = path.join(__dirname, "../../ipc_metadata.json");
    try {
      const content = await fs.readFile(metadataPath, "utf-8");
      rustMetadata = JSON.parse(content);
    } catch (error) {
      throw new Error(
        `Failed to load Rust metadata. Run 'cargo build' first. Error: ${error}`,
      );
    }
  });

  describe("Command Names", () => {
    it("should have all TypeScript commands defined in Rust", () => {
      const tsCommands = Object.values(IPC_COMMANDS);
      const rustCommands = Object.keys(rustMetadata.commands);

      for (const tsCommand of tsCommands) {
        expect(rustCommands).toContain(tsCommand);
      }
    });

    it("should have all Rust commands defined in TypeScript", () => {
      const tsCommands = Object.values(IPC_COMMANDS);
      const rustCommands = Object.keys(rustMetadata.commands);

      for (const rustCommand of rustCommands) {
        expect(tsCommands).toContain(rustCommand);
      }
    });

    it("should have matching command names in IPC_COMMANDS mapping", () => {
      // Ensure the TypeScript constant names map to the correct Rust command names
      const expectedMappings: Record<string, string> = {
        GET_DISPLAYS: "get_displays",
        CREATE_OVERLAY_FOR_DISPLAY: "create_overlay_for_display",
        TOGGLE_OVERLAY_VISIBILITY: "toggle_overlay_visibility",
        SET_OVERLAY_OPACITY: "set_overlay_opacity",
        VERIFY_AND_RECOVER_OVERLAYS: "verify_and_recover_overlays",
        GET_OVERLAY_STATES: "get_overlay_states",
        CLEANUP_ORPHANED_STATES: "cleanup_orphaned_states",
        FORCE_RECREATE_OVERLAY: "force_recreate_overlay",
      };

      for (const [tsName, rustName] of Object.entries(expectedMappings)) {
        expect(IPC_COMMANDS).toHaveProperty(tsName);
        expect(IPC_COMMANDS[tsName as keyof typeof IPC_COMMANDS]).toBe(
          rustName,
        );
      }
    });
  });

  describe("Command Parameters", () => {
    it("should use camelCase for displayId parameters", () => {
      const commandsWithDisplayId = [
        "create_overlay_for_display",
        "toggle_overlay_visibility",
        "set_overlay_opacity",
        "force_recreate_overlay",
      ];

      for (const command of commandsWithDisplayId) {
        const params = rustMetadata.commands[command].params;
        const displayIdParam = params.find((p) => p.name === "displayId");

        expect(displayIdParam).toBeDefined();
        expect(displayIdParam?.camelCase).toBe(true);
      }
    });

    it("should have correct parameter types", () => {
      // Validate specific command parameters
      const expectations = {
        create_overlay_for_display: [{ name: "displayId", type: "String" }],
        toggle_overlay_visibility: [
          { name: "displayId", type: "String" },
          { name: "visible", type: "bool" },
        ],
        set_overlay_opacity: [
          { name: "displayId", type: "String" },
          { name: "opacity", type: "f32" },
        ],
      };

      for (const [command, expectedParams] of Object.entries(expectations)) {
        const actualParams = rustMetadata.commands[command].params;

        expect(actualParams.length).toBe(expectedParams.length);

        for (const expected of expectedParams) {
          const actual = actualParams.find((p) => p.name === expected.name);
          expect(actual).toBeDefined();
          expect(actual?.type).toBe(expected.type);
        }
      }
    });
  });

  describe("Event Names", () => {
    it("should have all TypeScript events defined in Rust", () => {
      const tsEvents = Object.keys(IpcEventPayloads);
      const rustEvents = Object.keys(rustMetadata.events);

      for (const tsEvent of tsEvents) {
        expect(rustEvents).toContain(tsEvent);
      }
    });

    it("should have matching event payload types", () => {
      const eventExpectations = {
        "toggle-all-displays": "void",
        "toggle-display": "number",
        "opacity-update": "number",
      };

      for (const [eventName, expectedType] of Object.entries(
        eventExpectations,
      )) {
        expect(rustMetadata.events[eventName].payload).toBe(expectedType);
      }
    });
  });

  describe("Type Safety", () => {
    it("should enforce non-empty parameter arrays for commands with params", () => {
      const commandsWithParams = [
        "create_overlay_for_display",
        "toggle_overlay_visibility",
        "set_overlay_opacity",
        "force_recreate_overlay",
      ];

      for (const command of commandsWithParams) {
        expect(rustMetadata.commands[command].params.length).toBeGreaterThan(0);
      }
    });

    it("should enforce empty parameter arrays for parameterless commands", () => {
      const parameterlessCommands = [
        "get_displays",
        "verify_and_recover_overlays",
        "get_overlay_states",
        "cleanup_orphaned_states",
      ];

      for (const command of parameterlessCommands) {
        expect(rustMetadata.commands[command].params.length).toBe(0);
      }
    });
  });
});
