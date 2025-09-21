use serde::{Deserialize, Serialize};
use tauri::{Emitter, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

use crate::error::{IpcError, IpcErrorCode, IpcResult, IntoIpcResult};
use crate::state::get_app_state;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Display {
    pub id: String,
    pub name: String,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub is_primary: bool,
    pub scale_factor: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DisplayState {
    pub display_id: String,
    pub is_blackout: bool,
    pub opacity: f32,
}

impl Display {
    pub fn create_overlay_window(
        &self,
        app_handle: &tauri::AppHandle,
    ) -> Result<WebviewWindow, tauri::Error> {
        let window_label = format!("overlay-{}", self.id);
        
        let window = WebviewWindowBuilder::new(
            app_handle,
            window_label,
            WebviewUrl::App("index.html".into()),
        )
        .title(format!("Overlay - {}", self.name))
        .position(self.x as f64, self.y as f64)
        .inner_size(self.width as f64, self.height as f64)
        .fullscreen(false)
        .decorations(false)
        .always_on_top(true)
        .resizable(false)
        .skip_taskbar(true)
        .focused(false)
        .visible(false)
        .transparent(true)
        .accept_first_mouse(false)
        .build()?;
        
        // macOS-specific settings for transparency
        #[cfg(target_os = "macos")]
        {
            use tauri::window::Color;
            let _ = window.set_background_color(Some(Color(0, 0, 0, 0)));
            // Make window click-through
            let _ = window.set_ignore_cursor_events(true);
        }
        
        Ok(window)
    }
}

#[tauri::command]
pub fn get_displays(app_handle: tauri::AppHandle) -> IpcResult<Vec<Display>> {
    let monitors = app_handle
        .available_monitors()
        .into_ipc_result(IpcErrorCode::Unknown)?;
    
    Ok(monitors
        .into_iter()
        .enumerate()
        .map(|(index, monitor)| {
            let position = monitor.position();
            let size = monitor.size();
            
            Display {
                id: format!("display-{}", index + 1),
                name: monitor.name().map(|s| s.to_string()).unwrap_or_else(|| format!("Display {}", index + 1)),
                x: position.x,
                y: position.y,
                width: size.width,
                height: size.height,
                is_primary: index == 0, // Simplified primary detection
                scale_factor: monitor.scale_factor(),
            }
        })
        .collect())
}

#[tauri::command]
pub fn create_overlay_for_display(
    app_handle: tauri::AppHandle,
    #[allow(non_snake_case)]
    displayId: String,
) -> IpcResult<()> {
    let window_label = format!("overlay-{}", displayId);
    
    // Check if window already exists
    if app_handle.get_webview_window(&window_label).is_some() {
        return Ok(()); // Window already exists, return success
    }
    
    let displays = get_displays(app_handle.clone())?;
    
    let display = displays
        .iter()
        .find(|d| d.id == displayId)
        .ok_or_else(|| {
            IpcError::new(
                IpcErrorCode::DisplayNotFound,
                format!("Display '{}' not found", displayId),
            )
        })?;
    
    // Create overlay window
    let window = display.create_overlay_window(&app_handle)
        .map_err(|e| {
            IpcError::new(
                IpcErrorCode::WindowCreateFailed,
                format!("Failed to create overlay window: {}", e),
            )
        })?;
    
    // Initialize display ID in the window
    window
        .eval(&format!("window.__DISPLAY_ID__ = '{}';", displayId))
        .map_err(|e| {
            IpcError::new(
                IpcErrorCode::Unknown,
                format!("Failed to set display ID in window: {}", e),
            )
        })?;
    
    // Initialize state for this overlay
    let state = get_app_state(&app_handle);
    let overlay_state = crate::state::OverlayState::new(displayId.clone());
    state.set_overlay_state(displayId, overlay_state)?;
    
    Ok(())
}

#[tauri::command]
pub fn toggle_overlay_visibility(
    app_handle: tauri::AppHandle,
    #[allow(non_snake_case)]
    displayId: String,
    visible: bool,
) -> IpcResult<()> {
    let window_label = format!("overlay-{}", displayId);
    
    // Handle window creation if needed
    let window = if visible {
        // Try to get existing window first
        match app_handle.get_webview_window(&window_label) {
            Some(w) => w,
            None => {
                // Create window if it doesn't exist
                create_overlay_for_display(app_handle.clone(), displayId.clone())?;
                
                // Get the newly created window
                app_handle.get_webview_window(&window_label).ok_or_else(|| {
                    IpcError::new(
                        IpcErrorCode::WindowCreateFailed,
                        "Failed to get overlay window after creation",
                    )
                })?
            }
        }
    } else {
        // If hiding and window doesn't exist, that's ok
        match app_handle.get_webview_window(&window_label) {
            Some(w) => w,
            None => return Ok(()),
        }
    };
    
    // Update state first
    let state = get_app_state(&app_handle);
    state.update_overlay_state(&displayId, |overlay| {
        overlay.is_visible = visible;
    })?;
    
    // Apply visibility change with error recovery
    let visibility_result = if visible {
        // When showing, ensure window is properly configured
        window.set_ignore_cursor_events(true)
            .map_err(|e| IpcError::from_error(IpcErrorCode::Unknown, &e))?;
        
        window.show()
    } else {
        window.hide()
    };
    
    // Handle visibility errors with recovery
    match visibility_result {
        Ok(_) => Ok(()),
        Err(e) => {
            // Try to recover by recreating the window if it failed
            if visible {
                // Log error and attempt recovery
                eprintln!("Failed to show overlay window: {}. Attempting recovery...", e);
                
                // Close the problematic window
                let _ = window.close();
                
                // Remove from state
                state.remove_overlay_state(&displayId)?;
                
                // Try to recreate
                create_overlay_for_display(app_handle.clone(), displayId.clone())?;
                
                // Try to show again
                if let Some(new_window) = app_handle.get_webview_window(&window_label) {
                    new_window.show()
                        .map_err(|e| IpcError::from_error(IpcErrorCode::WindowCreateFailed, &e))?;
                    state.update_overlay_state(&displayId, |overlay| {
                        overlay.is_visible = true;
                    })?;
                }
                
                Ok(())
            } else {
                Err(IpcError::from_error(IpcErrorCode::Unknown, &e))
            }
        }
    }
}

#[tauri::command]
pub fn set_overlay_opacity(
    app_handle: tauri::AppHandle,
    #[allow(non_snake_case)]
    displayId: String,
    opacity: f32,
) -> IpcResult<()> {
    // Validate opacity range
    if !(0.0..=1.0).contains(&opacity) {
        return Err(IpcError::new(
            IpcErrorCode::InvalidParameter,
            format!("Opacity must be between 0.0 and 1.0, got {}", opacity),
        ));
    }
    
    let window_label = format!("overlay-{}", displayId);
    let window = app_handle.get_webview_window(&window_label)
        .ok_or_else(|| {
            IpcError::new(
                IpcErrorCode::DisplayNotFound,
                format!("Overlay window not found for display '{}'", displayId),
            )
        })?;
    
    // Update opacity in state
    let state = get_app_state(&app_handle);
    state.update_overlay_state(&displayId, |overlay| {
        overlay.opacity = opacity;
    })?;
    
    // Emit opacity update to the specific overlay window
    window.emit("opacity-update", opacity)
        .map_err(|e| IpcError::from_error(IpcErrorCode::Unknown, &e))?;
    
    Ok(())
}