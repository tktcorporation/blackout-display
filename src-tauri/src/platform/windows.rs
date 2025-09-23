// platform/windows.rs
//
// Purpose: Windows-specific implementation for transparent overlay windows
//
// This module provides Windows-specific functionality to create transparent,
// click-through overlay windows using the Windows API. It addresses the
// limitations of Tauri's built-in transparency support on Windows.
//
// Key features:
// - Uses SetLayeredWindowAttributes for transparency
// - Implements WS_EX_LAYERED and WS_EX_TRANSPARENT styles
// - Provides click-through functionality
// - Handles DWM (Desktop Window Manager) integration for Windows 10+
//
// Dependencies:
// - windows-rs crate for WinAPI access
// - Tauri window handles
use windows::Win32::{
    Foundation::{BOOL, COLORREF, HWND},
    Graphics::Dwm::{DwmEnableBlurBehindWindow, DwmExtendFrameIntoClientArea, DWM_BLURBEHIND},
    Graphics::Gdi::{CreateRectRgn, DeleteObject},
    UI::WindowsAndMessaging::{
        GetWindowLongW, SetLayeredWindowAttributes, SetWindowLongW, GWL_EXSTYLE, LWA_ALPHA,
        WS_EX_LAYERED, WS_EX_TOOLWINDOW, WS_EX_TRANSPARENT,
    },
};

// Applies Windows-specific transparency settings to an overlay window
//
// Purpose: Configures a window to be transparent and click-through on Windows
// using the Windows API directly, as Tauri's built-in transparency support
// is incomplete on this platform.
//
// @param hwnd - The window handle to apply transparency to
// @param opacity - The opacity level (0.0 to 1.0)
// @returns Result indicating success or failure
//
// Side Effects:
// - Modifies window extended styles (WS_EX_LAYERED, WS_EX_TRANSPARENT)
// - Sets window transparency using SetLayeredWindowAttributes
// - Optionally applies DWM blur effects for better transparency
pub fn apply_transparency_to_window(hwnd: isize, opacity: f32) -> Result<(), String> {
    unsafe {
        let hwnd = HWND(hwnd as *mut std::ffi::c_void);

        // Get current extended window style
        let current_style = GetWindowLongW(hwnd, GWL_EXSTYLE);

        // Add WS_EX_LAYERED and WS_EX_TRANSPARENT for click-through
        let new_style = current_style
            | WS_EX_LAYERED.0 as i32
            | WS_EX_TRANSPARENT.0 as i32
            | WS_EX_TOOLWINDOW.0 as i32;

        // Apply the new style
        SetWindowLongW(hwnd, GWL_EXSTYLE, new_style);

        // Calculate alpha value (0-255)
        let alpha = (opacity * 255.0) as u8;

        // Set the transparency using SetLayeredWindowAttributes
        // Using LWA_ALPHA for opacity control
        let result = SetLayeredWindowAttributes(
            hwnd,
            COLORREF(0), // color key (not used when using LWA_ALPHA only)
            alpha,
            LWA_ALPHA,
        );

        if result.is_err() {
            return Err(format!(
                "Failed to set layered window attributes: {:?}",
                result
            ));
        }

        // Try to apply DWM effects for better transparency on Windows 10+
        // This is optional and may fail on older Windows versions
        apply_dwm_transparency(hwnd, opacity);

        Ok(())
    }
}

// Removes click-through behavior from a window
//
// Purpose: Makes a window interactive again by removing the WS_EX_TRANSPARENT style
//
// @param hwnd - The window handle to make interactive
// @returns Result indicating success or failure
pub fn remove_click_through(hwnd: isize) -> Result<(), String> {
    unsafe {
        let hwnd = HWND(hwnd as *mut std::ffi::c_void);

        // Get current extended window style
        let current_style = GetWindowLongW(hwnd, GWL_EXSTYLE);

        // Remove WS_EX_TRANSPARENT to allow interaction
        let new_style = current_style & !(WS_EX_TRANSPARENT.0 as i32);

        // Apply the new style
        SetWindowLongW(hwnd, GWL_EXSTYLE, new_style);

        Ok(())
    }
}

// Applies click-through behavior to a window
//
// Purpose: Makes a window non-interactive by adding the WS_EX_TRANSPARENT style
//
// @param hwnd - The window handle to make click-through
// @returns Result indicating success or failure
pub fn apply_click_through(hwnd: isize) -> Result<(), String> {
    unsafe {
        let hwnd = HWND(hwnd as *mut std::ffi::c_void);

        // Get current extended window style
        let current_style = GetWindowLongW(hwnd, GWL_EXSTYLE);

        // Add WS_EX_TRANSPARENT for click-through
        let new_style = current_style | WS_EX_TRANSPARENT.0 as i32;

        // Apply the new style
        SetWindowLongW(hwnd, GWL_EXSTYLE, new_style);

        Ok(())
    }
}

// Applies DWM transparency effects for Windows 10+
//
// Purpose: Uses Desktop Window Manager APIs to enhance transparency effects
// on Windows 10 and later versions.
//
// @param hwnd - The window handle
// @param opacity - The opacity level (not directly used by DWM, but kept for future use)
//
// Side Effects:
// - Extends frame into client area for full transparency
// - May fail silently on older Windows versions
fn apply_dwm_transparency(hwnd: HWND, _opacity: f32) {
    unsafe {
        // For Windows 10+, use DwmExtendFrameIntoClientArea for full transparency
        let margins = windows::Win32::UI::Controls::MARGINS {
            cxLeftWidth: -1,
            cxRightWidth: -1,
            cyTopHeight: -1,
            cyBottomHeight: -1,
        };

        // This may fail on older Windows versions, which is okay
        let _ = DwmExtendFrameIntoClientArea(hwnd, &margins);

        // Alternative: Try blur behind window for older versions
        // This doesn't work on Windows 10+ but may help on Windows 7/8
        let region = CreateRectRgn(0, 0, -1, -1);
        if !region.is_invalid() {
            let blur_behind = DWM_BLURBEHIND {
                dwFlags: 0x00000001 | 0x00000002, // DWM_BB_ENABLE | DWM_BB_BLURREGION
                fEnable: BOOL::from(true),
                hRgnBlur: region,
                fTransitionOnMaximized: BOOL::from(true),
            };

            let _ = DwmEnableBlurBehindWindow(hwnd, &blur_behind);
            let _ = DeleteObject(region);
        }
    }
}

// Gets the native window handle from a Tauri window
//
// Purpose: Extracts the platform-specific window handle (HWND) from a Tauri window
// for use with Windows API functions.
//
// @param window - The Tauri window
// @returns The HWND as an isize, or error if extraction fails
pub fn get_hwnd_from_tauri_window(window: &tauri::WebviewWindow) -> Result<isize, String> {
    use raw_window_handle::HasWindowHandle;

    match window.window_handle() {
        Ok(handle) => match handle.as_raw() {
            raw_window_handle::RawWindowHandle::Win32(handle) => Ok(handle.hwnd.get() as isize),
            _ => Err("Not a Windows window handle".to_string()),
        },
        Err(e) => Err(format!("Failed to get window handle: {}", e)),
    }
}
