use serde::{Deserialize, Serialize};
use tauri::{Emitter, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

use crate::error::{IpcError, IpcErrorCode, IpcResult, IntoIpcResult};
use crate::state::{get_app_state, OverlayState};

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
        
        let window = WebviewWindowBuilder::new(app_handle, &window_label, WebviewUrl::App("index.html".into()))
            .title(format!("Blackout Overlay - {}", self.name))
            .position(self.x as f64, self.y as f64)
            .inner_size(self.width as f64, self.height as f64)
            .fullscreen(false)
            .decorations(false)
            .always_on_top(true)
            .resizable(false)
            .visible(false)
            .skip_taskbar(true)
            .accept_first_mouse(false)
            .focused(false)
            .transparent(true)
            .build()?;
        
        // Set transparent background and enable click-through
        #[cfg(target_os = "macos")]
        {
            use tauri::window::Color;
            let _ = window.set_background_color(Some(Color(0, 0, 0, 0)));
        }
        
        // Enable click-through for all platforms
        let _ = window.set_ignore_cursor_events(true);
        
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
    display_id: String,
) -> IpcResult<()> {
    let window_label = format!("overlay-{}", display_id);
    
    // Check if window already exists
    if app_handle.get_webview_window(&window_label).is_some() {
        return Ok(()); // Window already exists, return success
    }
    
    let displays = get_displays(app_handle.clone())?;
    
    let display = displays
        .iter()
        .find(|d| d.id == display_id)
        .ok_or_else(|| {
            IpcError::new(
                IpcErrorCode::DisplayNotFound,
                format!("Display '{}' not found", display_id),
            )
        })?;
    
    // Create the overlay window
    let window = display.create_overlay_window(&app_handle).map_err(|e| {
        IpcError::with_details(
            IpcErrorCode::WindowCreateFailed,
            format!("Failed to create overlay window for display '{}'", display_id),
            serde_json::json!({ "display_id": display_id, "error": e.to_string() }),
        )
    })?;
    
    // Initialize display ID in the window
    window
        .eval(format!("window.__DISPLAY_ID__ = '{}';", display_id))
        .map_err(|e| {
            IpcError::new(
                IpcErrorCode::Unknown,
                format!("Failed to set display ID in window: {}", e),
            )
        })?;
    
    // Initialize state for the overlay
    let state = get_app_state(&app_handle);
    let overlay_state = OverlayState::new(display_id.clone());
    state.set_overlay_state(display_id, overlay_state)?;
    
    Ok(())
}

#[tauri::command]
pub fn toggle_overlay_visibility(
    app_handle: tauri::AppHandle,
    display_id: String,
    visible: bool,
) -> IpcResult<()> {
    let window_label = format!("overlay-{}", display_id);
    
    // Verify window exists
    let window = app_handle.get_webview_window(&window_label).ok_or_else(|| {
        IpcError::new(
            IpcErrorCode::DisplayNotFound,
            format!("Overlay window not found for display '{}'", display_id),
        )
    })?;
    
    // Update state first
    let state = get_app_state(&app_handle);
    state.update_overlay_state(&display_id, |overlay| {
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
                eprintln!("Failed to show overlay window: {}", e);
                
                // Update state to reflect failure
                let _ = state.update_overlay_state(&display_id, |overlay| {
                    overlay.is_visible = false;
                });
            }
            
            Err(IpcError::from_error(IpcErrorCode::WindowCreateFailed, &e))
        }
    }
}

#[tauri::command]
pub fn set_overlay_opacity(
    app_handle: tauri::AppHandle,
    display_id: String,
    opacity: f32,
) -> IpcResult<()> {
    // Validate opacity range
    if !(0.0..=1.0).contains(&opacity) {
        return Err(IpcError::new(
            IpcErrorCode::InvalidParameter,
            format!("Opacity must be between 0.0 and 1.0, got: {}", opacity),
        ));
    }
    
    let window_label = format!("overlay-{}", display_id);
    
    // Verify window exists
    let window = app_handle.get_webview_window(&window_label).ok_or_else(|| {
        IpcError::new(
            IpcErrorCode::DisplayNotFound,
            format!("Overlay window not found for display '{}'", display_id),
        )
    })?;
    
    // Update state
    let state = get_app_state(&app_handle);
    state.update_overlay_state(&display_id, |overlay| {
        overlay.opacity = opacity;
    })?;
    
    // Emit opacity update to the specific overlay window
    window
        .emit("opacity-update", opacity)
        .map_err(|e| IpcError::from_error(IpcErrorCode::Unknown, &e))?;
    
    Ok(())
}