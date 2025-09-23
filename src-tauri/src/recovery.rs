use crate::display::create_overlay_for_display;
use crate::error::{IpcError, IpcErrorCode, IpcResult};
use crate::state::{get_app_state, verify_overlay_window_exists};
use tauri::{AppHandle, Manager};

/// Verify and recover overlay windows if needed
#[tauri::command]
pub async fn verify_and_recover_overlays(app_handle: AppHandle) -> IpcResult<Vec<String>> {
    let state = get_app_state(&app_handle);
    let overlay_states = state.get_all_overlay_states()?;
    let mut recovered = Vec::new();

    for overlay in overlay_states {
        let display_id = overlay.display_id.clone();

        // Check if the window exists
        if !verify_overlay_window_exists(&app_handle, &display_id) {
            // Window doesn't exist but state says it should - try to recover
            eprintln!(
                "Overlay window for display {} is missing, attempting recovery",
                display_id
            );

            // Try to recreate the window
            match create_overlay_for_display(app_handle.clone(), display_id.clone()) {
                Ok(_) => {
                    recovered.push(display_id.clone());

                    // Restore previous visibility state if it was visible
                    if overlay.is_visible {
                        let window_label = format!("overlay-{}", display_id);
                        if let Some(window) = app_handle.get_webview_window(&window_label) {
                            let _ = window.show();
                        }
                    }
                }
                Err(e) => {
                    eprintln!(
                        "Failed to recover overlay for display {}: {}",
                        display_id, e
                    );
                    // Remove the invalid state
                    let _ = state.remove_overlay_state(&display_id);
                }
            }
        }
    }

    Ok(recovered)
}

/// Get the current state of all overlays
#[tauri::command]
pub fn get_overlay_states(app_handle: AppHandle) -> IpcResult<serde_json::Value> {
    let state = get_app_state(&app_handle);
    let overlay_states = state.get_all_overlay_states()?;

    let mut result = Vec::new();

    for overlay in overlay_states {
        let window_exists = verify_overlay_window_exists(&app_handle, &overlay.display_id);

        result.push(serde_json::json!({
            "display_id": overlay.display_id,
            "is_visible": overlay.is_visible,
            "opacity": overlay.opacity,
            "is_click_through": overlay.is_click_through,
            "window_exists": window_exists,
        }));
    }

    Ok(serde_json::json!(result))
}

/// Clean up orphaned overlay states (states without corresponding windows)
#[tauri::command]
pub fn cleanup_orphaned_states(app_handle: AppHandle) -> IpcResult<Vec<String>> {
    let state = get_app_state(&app_handle);
    let overlay_states = state.get_all_overlay_states()?;
    let mut cleaned = Vec::new();

    for overlay in overlay_states {
        if !verify_overlay_window_exists(&app_handle, &overlay.display_id) {
            state.remove_overlay_state(&overlay.display_id)?;
            cleaned.push(overlay.display_id);
        }
    }

    Ok(cleaned)
}

/// Force recreate an overlay window
#[tauri::command]
pub fn force_recreate_overlay(
    app_handle: AppHandle,
    #[allow(non_snake_case)] displayId: String,
) -> IpcResult<()> {
    let window_label = format!("overlay-{}", displayId);

    // Close existing window if it exists
    if let Some(window) = app_handle.get_webview_window(&window_label) {
        window.close().map_err(|e| {
            IpcError::new(
                IpcErrorCode::WindowCreateFailed,
                format!("Failed to close existing window: {}", e),
            )
        })?;
    }

    // Remove old state
    let state = get_app_state(&app_handle);
    state.remove_overlay_state(&displayId)?;

    // Recreate the window
    create_overlay_for_display(app_handle, displayId)
}
