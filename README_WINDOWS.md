# Windows Environment Setup and Testing Guide

## Overview

This document explains how to test and debug the blackout overlay functionality on Windows platforms. The Windows implementation uses native Windows APIs to achieve transparent, click-through overlay windows.

## Windows-Specific Implementation Details

### Key Technologies Used

1. **WS_EX_LAYERED**: Extended window style that enables transparency
2. **WS_EX_TRANSPARENT**: Makes the window click-through
3. **SetLayeredWindowAttributes**: Windows API function for setting transparency
4. **DwmExtendFrameIntoClientArea**: Desktop Window Manager API for Windows 10+ transparency

### Known Limitations

- Full click-through transparent windows are achieved through Windows-specific APIs, not Tauri's built-in methods
- Different Windows versions may behave slightly differently
- Windows 10+ uses DWM APIs, while older versions use legacy methods

## Development Environment Setup

### Prerequisites

1. **Windows 10 or later** (Windows 11 recommended)
2. **Visual Studio Build Tools** or **Visual Studio 2022**
   ```powershell
   # Install via winget
   winget install Microsoft.VisualStudio.2022.BuildTools
   ```
3. **Rust toolchain**
   ```powershell
   # Install via rustup
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```
4. **Node.js and pnpm**
   ```powershell
   # Install Node.js
   winget install OpenJS.NodeJS

   # Install pnpm
   npm install -g pnpm
   ```

### Building the Application

1. **Install dependencies**
   ```powershell
   pnpm install
   ```

2. **Run in development mode**
   ```powershell
   pnpm tauri dev
   ```

3. **Build for production**
   ```powershell
   pnpm tauri build
   ```

## Testing the Overlay

### Basic Functionality Tests

1. **Launch the application**
   - The main control window should appear
   - Check that it displays all available monitors

2. **Test overlay creation**
   - Click "Blackout" for a specific display
   - The overlay should appear on that display
   - The overlay should be semi-transparent (default 80% opacity)

3. **Test transparency**
   - Adjust the opacity slider
   - The overlay darkness should change accordingly
   - At 0% opacity, the overlay should be invisible
   - At 100% opacity, the screen should be completely black

4. **Test click-through**
   - When the overlay is active, try clicking on items behind it
   - Clicks should pass through to applications behind the overlay
   - The overlay itself should not be interactive

5. **Test keyboard shortcuts**
   - `Ctrl+Shift+B`: Toggle all displays
   - `Ctrl+Alt+1` through `Ctrl+Alt+4`: Toggle specific displays

### Debugging Tips

1. **Enable debug output**
   - Run the app with console output visible:
     ```powershell
     pnpm tauri dev --verbose
     ```
   - Check for error messages in the console

2. **Check Windows Event Viewer**
   - Open Event Viewer (eventvwr.msc)
   - Look for application errors under Windows Logs > Application

3. **Verify window properties**
   - Use Spy++ (included with Visual Studio) to inspect window properties
   - Check that WS_EX_LAYERED and WS_EX_TRANSPARENT are set

4. **Test on different displays**
   - If you have multiple monitors, test on each one
   - Check different DPI settings
   - Test with different display arrangements

### Common Issues and Solutions

#### Issue: Overlay doesn't appear
**Solution**:
- Check console for HWND acquisition errors
- Verify that the windows-rs crate dependencies are installed
- Try running as Administrator

#### Issue: Overlay isn't transparent
**Solution**:
- Check that your Windows version supports transparency
- Verify graphics drivers are up to date
- Check DWM (Desktop Window Manager) is enabled

#### Issue: Can't click through the overlay
**Solution**:
- Verify WS_EX_TRANSPARENT is being applied
- Check for JavaScript errors preventing proper initialization
- Ensure the overlay window is not capturing focus

#### Issue: Overlay appears on wrong monitor
**Solution**:
- Check monitor detection in the console output
- Verify display coordinates are correct
- Test with different display arrangements in Windows settings

## Performance Considerations

1. **GPU Acceleration**
   - Ensure hardware acceleration is enabled in Windows
   - Update graphics drivers for best performance

2. **DWM Composition**
   - Keep DWM enabled for best transparency effects
   - Disabling DWM may cause visual artifacts

3. **Multiple Displays**
   - Each overlay window uses system resources
   - Monitor CPU and GPU usage with many displays

## Logging and Diagnostics

The application provides detailed logging for Windows-specific operations:

```
Creating overlay for display: Display 1 at position (0, 0) with size 1920x1080
Building Windows overlay with transparency enabled
Got HWND: 123456, applying transparency
Successfully applied Windows transparency
```

Look for these messages to diagnose issues.

## Building for Distribution

### Creating an Installer

```powershell
# Build the application
pnpm tauri build

# The installer will be created at:
# src-tauri/target/release/bundle/msi/blackout_0.1.0_x64.msi
```

### Code Signing (Optional)

For distribution without security warnings:
1. Obtain a code signing certificate
2. Sign the executable and installer
3. See Tauri documentation for detailed signing instructions

## Additional Resources

- [Windows Layered Windows Documentation](https://docs.microsoft.com/en-us/windows/win32/winmsg/window-features#layered-windows)
- [Desktop Window Manager APIs](https://docs.microsoft.com/en-us/windows/win32/dwm/dwm-overview)
- [Tauri Windows Platform Documentation](https://tauri.app/v1/guides/building/windows)

## Contact and Support

If you encounter Windows-specific issues not covered here:
1. Check the console output for error messages
2. Create an issue on GitHub with:
   - Windows version (run `winver`)
   - Graphics card and driver version
   - Console output with --verbose flag
   - Steps to reproduce the issue