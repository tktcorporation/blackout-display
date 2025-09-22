/**
 * setup.ts
 *
 * Purpose: Test environment setup for all tests
 *
 * This file:
 * - Configures global test utilities
 * - Mocks Tauri API for testing
 * - Sets up any global test fixtures
 */

// Mock Tauri API for tests
// @ts-expect-error - Creating global mock
globalThis.__TAURI__ = {
  invoke: async (cmd: string, args?: unknown) => {
    console.log(`Mock Tauri invoke: ${cmd}`, args);
    return Promise.resolve({});
  },
  event: {
    emit: async () => {},
    listen: async () => ({ unlisten: () => {} }),
  },
};
