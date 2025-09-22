#!/bin/bash

# dev3000 servers-only mode for Tauri development
# This script runs dev3000 in servers-only mode to avoid browser conflicts

echo "Starting dev3000 in servers-only mode..."
echo "This mode captures logs without launching a browser."
echo ""
echo "To start your Tauri app, run in another terminal:"
echo "  pnpm tauri dev"
echo ""
echo "Logs will be available at: /tmp/d3k.log"
echo ""

# Add pnpm global bin directory to PATH
export PATH="/Users/tkt/Library/pnpm:$PATH"

# Start dev3000 in servers-only mode (no browser)
exec dev3000 --servers-only --port 1420