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

**IMPORTANT**: Always run linting and type checking after making changes:
```bash
pnpm lint src/ && pnpm typecheck && cargo clippy --manifest-path src-tauri/Cargo.toml
```

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