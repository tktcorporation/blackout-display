use serde::{Deserialize, Serialize};
use tauri::{Emitter, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

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
        
        // Set transparent background
        #[cfg(target_os = "macos")]
        {
            use tauri::window::Color;
            let _ = window.set_background_color(Some(Color(0, 0, 0, 0)));
        }
        
        Ok(window)
    }
}

#[tauri::command]
pub fn get_displays(app_handle: tauri::AppHandle) -> Vec<Display> {
    let monitors = app_handle.available_monitors().unwrap_or_default();
    
    monitors
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
        .collect()
}

#[tauri::command]
pub fn create_overlay_for_display(
    app_handle: tauri::AppHandle,
    display_id: String,
) -> Result<(), String> {
    let window_label = format!("overlay-{}", display_id);
    
    // Check if window already exists
    if app_handle.get_webview_window(&window_label).is_some() {
        return Ok(()); // Window already exists, return success
    }
    
    let displays = get_displays(app_handle.clone());
    
    if let Some(display) = displays.iter().find(|d| d.id == display_id) {
        match display.create_overlay_window(&app_handle) {
            Ok(window) => {
                // Load the overlay page
                let _ = window.eval(format!(
                    "window.__DISPLAY_ID__ = '{}';",
                    display_id
                ));
                Ok(())
            }
            Err(e) => Err(e.to_string()),
        }
    } else {
        Err("Display not found".to_string())
    }
}

#[tauri::command]
pub fn toggle_overlay_visibility(
    app_handle: tauri::AppHandle,
    display_id: String,
    visible: bool,
) -> Result<(), String> {
    let window_label = format!("overlay-{}", display_id);
    
    if let Some(window) = app_handle.get_webview_window(&window_label) {
        if visible {
            window.show().map_err(|e| e.to_string())?;
        } else {
            window.hide().map_err(|e| e.to_string())?;
        }
        Ok(())
    } else {
        Err("Overlay window not found".to_string())
    }
}

#[tauri::command]
pub fn set_overlay_opacity(
    app_handle: tauri::AppHandle,
    display_id: String,
    opacity: f32,
) -> Result<(), String> {
    let window_label = format!("overlay-{}", display_id);
    
    if let Some(window) = app_handle.get_webview_window(&window_label) {
        // Emit opacity update to the specific overlay window
        window
            .emit("opacity-update", opacity)
            .map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Overlay window not found".to_string())
    }
}