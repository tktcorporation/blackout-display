# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `pnpm dev` - Start Vite development server for frontend
- `pnpm tauri dev` - Run Tauri app in development mode with hot reload

### Build
- `pnpm build` - Build frontend for production (TypeScript + Vite)
- `pnpm tauri build` - Build complete Tauri application
  - Creates platform-specific bundles:
    - macOS: `.app` in `src-tauri/target/release/bundle/macos/`, `.dmg` in `src-tauri/target/release/bundle/dmg/`
    - Windows: `.exe` installer in `src-tauri/target/release/bundle/nsis/`
    - Linux: `.AppImage` and `.deb` in corresponding bundle directories

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

### Debugging
- `pnpm dev:debug` - Start dev3000 log collector for enhanced debugging

## Architecture

This is a Tauri v2 application that creates fullscreen black overlays for multi-display screen blackout control.

### Window Management System
- **Main Window**: Control panel for managing all displays (`src/ControlPanel.tsx`)
- **Overlay Windows**: Individual transparent overlay windows for each display
  - Label pattern: `overlay-{displayId}` for window identification
  - Created dynamically when blackout is enabled for a display

### Frontend (React + TypeScript)
- **Entry**: `src/main.tsx` → `src/App.tsx`
- **Window Detection**: App.tsx determines window type and renders appropriate component
- **Components**:
  - `ControlPanel.tsx`: Main control interface for all displays
  - `Overlay.tsx`: Black overlay component for individual display windows
  - `DisplayCard.tsx`: Individual display control card
- **State Management**: Local React state with optimistic updates
- **Type-safe IPC**: Custom wrapper in `src/lib/ipc.ts` for type-safe backend communication

### Backend (Rust + Tauri)
- **Entry**: `src-tauri/src/main.rs` → `src-tauri/src/lib.rs`
- **Display Management**: `src-tauri/src/display.rs`
  - Multi-monitor detection and management
  - Overlay window lifecycle (create/show/hide/destroy)
- **Recovery System**: `src-tauri/src/recovery.rs`
  - Handles orphaned states and window recovery
  - Ensures consistency between state and actual windows
- **Global Shortcuts**:
  - `Cmd/Ctrl+Shift+B`: Toggle all displays
  - `Cmd/Ctrl+Alt+[1-4]`: Toggle individual displays

### IPC Interface
**Commands** (TypeScript → Rust):
- `get_displays`: Get all available displays
- `create_overlay_for_display`: Create overlay window for specific display
- `toggle_overlay_visibility`: Show/hide overlay window
- `set_overlay_opacity`: Adjust overlay opacity (0-1)
- `verify_and_recover_overlays`: Check and recover missing overlay windows
- `force_recreate_overlay`: Force recreation of overlay window

**Events** (Rust → TypeScript):
- `toggle-all-displays`: Global shortcut triggered
- `toggle-display`: Individual display shortcut triggered
- `opacity-update`: Opacity change notification

### IPC Interface Validation
- Rust metadata generated during build (`src-tauri/build.rs`)
- TypeScript tests validate interface consistency (`src/__tests__/ipc-interface.test.ts`)
- Ensures type safety across language boundary

## Platform-Specific Considerations

### macOS
- Requires `macOSPrivateApi: true` in tauri.conf.json for proper transparency
- Window configuration: transparent, fullscreen, always-on-top
- Universal binary support for Intel and Apple Silicon

### Windows
- Special handling for transparent overlays (see `src-tauri/src/lib.rs`)
- Click-through behavior via window attributes
- NSIS installer for distribution

### Linux
- AppImage and .deb package formats
- X11/Wayland compatibility considerations

## Critical Files
- `src-tauri/tauri.conf.json`: Window configuration, must have `visible: false` to prevent initial flash
- `src-tauri/icons/`: Platform-specific icons (32x32, 128x128, .icns, .ico)
- `src-tauri/build.rs`: IPC metadata generation for interface validation

## Known Issues

1. **Initial Flash**: Main window must be set to `visible: false` in config and shown programmatically
2. **Overlay Timing**: Small delay needed after window creation before setting opacity
3. **Recovery System**: Currently disabled in ControlPanel.tsx, can be re-enabled after confirming basic functionality

## Development Environment

Uses Nix flake for reproducible development environment with:
- Rust toolchain
- Node.js 20+
- pnpm package manager
- Platform-specific dependencies

## Debugging with dev3000

The project includes dev3000 integration for enhanced debugging capabilities.

### Quick Start
1. Start dev3000: `pnpm dev:debug`
2. In another terminal: `pnpm tauri dev`
3. Logs available at `/tmp/d3k.log`

### MCP Tools Available
- `mcp__dev3000__debug_my_app`: Comprehensive application debugging
- `mcp__dev3000__execute_browser_action`: Automated browser testing

Custom logger at `src/utils/logger.ts` automatically sends frontend logs to dev3000.

## Code Documentation Requirements

**IMPORTANT**: All files and functions MUST include documentation explaining purpose and intent.

### File-level Documentation
Every file should explain:
- Purpose and problem it solves
- Key responsibilities
- Dependencies and relationships

### Function-level Documentation
Every function should document:
- Purpose and why it exists
- Parameters and expected values
- Return values and conditions
- Side effects and state changes