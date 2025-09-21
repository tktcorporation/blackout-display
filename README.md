# Blackout Display

A Tauri v2 application that creates a fullscreen black overlay for screen blackout purposes. Control multiple displays independently with adjustable opacity.

## Installation

### Download Pre-built Binaries

Download the latest release for your platform from the [Releases](https://github.com/tktcorporation/blackout-display/releases) page:

- **macOS**: `blackout_x.x.x_universal.dmg` (Universal binary for Intel and Apple Silicon)
- **Windows**: `blackout_x.x.x_x64-setup.exe`
- **Linux**: `blackout_x.x.x_amd64.AppImage` or `.deb`

## Features

- 🖥️ Multiple display support with individual control
- 🎚️ Adjustable opacity for each display (0-100%)
- ⌨️ Global keyboard shortcut (Cmd/Ctrl+Shift+B)
- 🖱️ Click-through overlay mode
- 🎯 Always-on-top fullscreen overlay

## Prerequisites

This project uses Nix Flake for development environment setup. You'll need:

- [Nix](https://nixos.org/download.html) with flakes enabled
- Or manually install:
  - Rust toolchain
  - Node.js
  - pnpm
  - Platform-specific dependencies (macOS frameworks)

## Setup

### Using Nix Flake (Recommended)

1. Clone the repository:
```bash
git clone https://github.com/tktcorporation/blackout-display.git
cd blackout-display
```

2. Enter the Nix development shell:
```bash
nix develop
```

3. Install dependencies:
```bash
pnpm install
```

### Manual Setup

If you're not using Nix, ensure you have:
- Rust (latest stable)
- Node.js (v18+)
- pnpm

Then install dependencies:
```bash
pnpm install
```

## Development

### Run in Development Mode

Start the Tauri application with hot-reload:
```bash
pnpm tauri dev
```

This will:
- Start the Vite development server for the frontend
- Compile and run the Rust backend
- Open the application window

### Linting and Type Checking

Before committing, ensure code quality:
```bash
# TypeScript linting and formatting
pnpm lint
pnpm lint:fix

# TypeScript type checking
pnpm typecheck

# Rust linting
cargo clippy --manifest-path src-tauri/Cargo.toml
```

## Build

### Build for Production

Create a production build:
```bash
pnpm tauri build
```

This will create:
- `.app` bundle in `src-tauri/target/release/bundle/macos/`
- `.dmg` installer in `src-tauri/target/release/bundle/dmg/`

## Usage

1. Launch the application
2. Use the control panel to:
   - Select which display to blackout
   - Adjust opacity for each display
   - Toggle individual displays on/off
3. Use the global shortcut `Cmd/Ctrl+Shift+B` to toggle all overlays
4. The overlay is click-through, so you can still interact with applications underneath

## Architecture

- **Frontend**: React + TypeScript + Vite
- **Backend**: Rust + Tauri v2
- **State Management**: Local React state
- **IPC**: Tauri event system for frontend-backend communication

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
