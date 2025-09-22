# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `pnpm dev` - Start Vite development server for frontend
- `pnpm tauri dev` - Run Tauri app in development mode with hot reload

### Build
- `pnpm build` - Build frontend for production (TypeScript + Vite)
- `pnpm tauri build` - Build complete Tauri application
  - Creates `.app` bundle in `src-tauri/target/release/bundle/macos/`
  - Creates `.dmg` installer in `src-tauri/target/release/bundle/dmg/`

### Dependencies
- `pnpm install` - Install all dependencies

### Code Quality
- `pnpm lint` - Run Biome linter on TypeScript files
- `pnpm lint:fix` - Auto-fix linting issues
- `pnpm typecheck` - Run TypeScript type checking
- `cargo clippy --manifest-path src-tauri/Cargo.toml` - Run Rust linter

### Testing
- `pnpm test` - Run tests in watch mode
- `pnpm test:run` - Run tests once
- `pnpm test:ui` - Run tests with UI interface

**IMPORTANT**: Always run linting, type checking, and tests after making changes:
```bash
pnpm lint src/ && pnpm typecheck && cargo clippy --manifest-path src-tauri/Cargo.toml && pnpm test:run
```

### IPC Interface Validation
The project includes automated validation to ensure TypeScript and Rust IPC interfaces stay in sync:
- Rust metadata is generated during build in `src-tauri/build.rs`
- Tests in `src/__tests__/ipc-interface.test.ts` validate interface consistency
- CI/CD runs these tests automatically on every commit

## Architecture

This is a Tauri v2 application that creates a fullscreen black overlay for screen blackout purposes.

### Frontend (React + TypeScript)
- **Entry**: `src/main.tsx` → `src/App.tsx`
- **State Management**: Local React state for visibility and opacity
- **Key Features**:
  - Listens for `toggle-overlay` event from Tauri backend
  - Registers global shortcut handler for `Cmd/Ctrl+Shift+B`
  - Opacity slider control (0-1 range)
  - Double-click to hide overlay

### Backend (Rust + Tauri)
- **Entry**: `src-tauri/src/main.rs` → `src-tauri/src/lib.rs`
- **Window Configuration**: `src-tauri/tauri.conf.json`
  - Fullscreen, transparent, always-on-top window
  - Initially hidden (`visible: false`)
  - Window shown after setup via `window.show()`
- **Global Shortcut**: Handled by `tauri-plugin-global-shortcut`
  - Emits `toggle-overlay` event on `Cmd/Ctrl+Shift+B`

### Critical Files
- `src-tauri/icons/icon.png` - Required 32x32 RGBA PNG icon
- `src-tauri/tauri.conf.json` - Window settings must have `visible: false` to prevent initial flash

## Known Issues

1. **Icon Requirements**: Tauri requires a valid 32x32 RGBA PNG at `src-tauri/icons/icon.png`
2. **Initial Flash**: Window must be set to `visible: false` in config and shown programmatically
3. **Transparency**: macOS requires proper window configuration for transparent overlays

## Development Environment

Uses Nix flake for reproducible development environment with:
- Rust toolchain
- Node.js
- Platform-specific dependencies (macOS frameworks)

## Debugging with dev3000

This project is configured with [dev3000](https://github.com/vercel-labs/dev3000) for enhanced AI-assisted debugging.

### Basic Usage
1. Start dev3000 log collector: `pnpm dev:debug`
2. In another terminal, start Tauri: `pnpm tauri dev`
3. Logs are available at `/tmp/d3k.log`

### MCP Integration
dev3000 includes an MCP (Model Context Protocol) server that allows Claude Code to directly:
- Analyze errors and debug issues
- Execute browser actions for testing
- Monitor application health

The MCP server is configured in `.mcp.json` and runs at `http://localhost:3684/api/mcp/mcp`.

To add the MCP server to Claude Code:
```bash
claude mcp add --transport http --scope project dev3000 http://localhost:3684/api/mcp/mcp
```

### Using dev3000 MCP Tools in Claude Code

Once dev3000 is running (`pnpm dev:debug`), you can use these MCP tools:

#### 1. Debug My App (`mcp__dev3000__debug_my_app`)
Comprehensive debugging tool that finds and analyzes all issues in your application.

**Available modes:**
- `snapshot`: Immediate analysis of current state
- `bisect`: Compare before/after states during user testing
- `monitor`: Continuous health monitoring

**Example usage:**
```
# Get immediate comprehensive analysis
Use mcp__dev3000__debug_my_app with mode: "snapshot"

# Debug issues that occurred in the last 5 minutes
Use mcp__dev3000__debug_my_app with mode: "snapshot", timeRangeMinutes: 5

# Focus on specific areas
Use mcp__dev3000__debug_my_app with mode: "snapshot", focusArea: "runtime"
```

#### 2. Execute Browser Action (`mcp__dev3000__execute_browser_action`)
Test user workflows and reproduce issues by automating browser interactions.

**Available actions:**
- `click`: Click buttons/links (requires x,y coordinates)
- `navigate`: Go to URLs
- `scroll`: Scroll pages
- `type`: Type text in forms
- `evaluate`: Read page state with JavaScript

**Example usage:**
```
# Navigate to a URL
Use mcp__dev3000__execute_browser_action with action: "navigate", params: {url: "http://localhost:1420"}

# Click at specific coordinates
Use mcp__dev3000__execute_browser_action with action: "click", params: {x: 100, y: 200}

# Type text
Use mcp__dev3000__execute_browser_action with action: "type", params: {text: "Hello World"}
```

**Note:** dev3000 automatically captures screenshots during interactions, so you don't need to manually take screenshots.

### Custom Logger
The project includes a custom logger (`src/utils/logger.ts`) that automatically sends frontend logs to dev3000.

## Code Documentation Requirements

**IMPORTANT**: All files and functions MUST include proper documentation explaining their purpose and intent.

### File-level Documentation
Every file should start with a comment block that explains:
- **Purpose**: Why this file exists and what problem it solves
- **Responsibilities**: What this file is responsible for
- **Dependencies**: Key dependencies or relationships with other parts of the system

Example:
```typescript
/**
 * ControlPanel.tsx
 * 
 * Purpose: Provides a user interface for controlling multiple display overlays
 * 
 * This component allows users to:
 * - View all available displays
 * - Toggle individual display overlays on/off
 * - Adjust opacity for each display independently
 * - See real-time status of each display
 * 
 * Dependencies:
 * - Communicates with Tauri backend via IPC events
 * - Uses DisplayCard component for individual display controls
 */
```

### Function-level Documentation
Every function should have a comment block that includes:
- **Purpose**: What the function does and why it exists
- **Parameters**: Description of each parameter and its expected values
- **Returns**: What the function returns and under what conditions
- **Side Effects**: Any side effects or state changes

Example:
```typescript
/**
 * Toggles the overlay visibility for a specific display
 * 
 * Purpose: Allows users to show/hide the blackout overlay on individual displays
 * without affecting other displays
 * 
 * @param displayId - Unique identifier of the display to toggle
 * @param visible - Whether to show (true) or hide (false) the overlay
 * @returns Promise that resolves when the backend has processed the command
 * 
 * Side Effects:
 * - Updates local state to reflect the new visibility status
 * - Sends IPC event to Tauri backend to update the actual overlay window
 */
```

### Why This Matters
Clear documentation ensures:
- Future developers (including yourself) understand the codebase quickly
- The intent behind design decisions is preserved
- Dependencies and relationships between components are explicit
- Maintenance and refactoring become easier