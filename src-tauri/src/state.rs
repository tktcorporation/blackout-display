use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager, State};

use crate::error::{IpcError, IpcErrorCode, IpcResult};

/// Represents the state of an overlay window
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OverlayState {
    pub display_id: String,
    pub is_visible: bool,
    pub opacity: f32,
    pub is_click_through: bool,
}

impl OverlayState {
    pub fn new(display_id: String) -> Self {
        Self {
            display_id,
            is_visible: false,
            opacity: 0.8, // Default to 80% opacity
            is_click_through: true,
        }
    }
}

/// Application-wide state manager
#[derive(Debug)]
pub struct AppState {
    overlays: Arc<Mutex<HashMap<String, OverlayState>>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            overlays: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Get the state of a specific overlay
    #[allow(dead_code)]
    pub fn get_overlay_state(&self, display_id: &str) -> Option<OverlayState> {
        self.overlays
            .lock()
            .ok()
            .and_then(|overlays| overlays.get(display_id).cloned())
    }

    /// Update overlay state
    pub fn update_overlay_state<F>(&self, display_id: &str, updater: F) -> IpcResult<()>
    where
        F: FnOnce(&mut OverlayState),
    {
        let mut overlays = self.overlays.lock().map_err(|e| {
            IpcError::new(
                IpcErrorCode::Unknown,
                format!("Failed to acquire lock: {}", e),
            )
        })?;

        match overlays.get_mut(display_id) {
            Some(state) => {
                updater(state);
                Ok(())
            }
            None => Err(IpcError::new(
                IpcErrorCode::DisplayNotFound,
                format!("Overlay state not found for display {}", display_id),
            )),
        }
    }

    /// Create or update overlay state
    pub fn set_overlay_state(&self, display_id: String, state: OverlayState) -> IpcResult<()> {
        let mut overlays = self.overlays.lock().map_err(|e| {
            IpcError::new(
                IpcErrorCode::Unknown,
                format!("Failed to acquire lock: {}", e),
            )
        })?;

        overlays.insert(display_id, state);
        Ok(())
    }

    /// Remove overlay state
    pub fn remove_overlay_state(&self, display_id: &str) -> IpcResult<()> {
        let mut overlays = self.overlays.lock().map_err(|e| {
            IpcError::new(
                IpcErrorCode::Unknown,
                format!("Failed to acquire lock: {}", e),
            )
        })?;

        overlays.remove(display_id);
        Ok(())
    }

    /// Get all overlay states
    pub fn get_all_overlay_states(&self) -> IpcResult<Vec<OverlayState>> {
        let overlays = self.overlays.lock().map_err(|e| {
            IpcError::new(
                IpcErrorCode::Unknown,
                format!("Failed to acquire lock: {}", e),
            )
        })?;

        Ok(overlays.values().cloned().collect())
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}

/// Helper function to get app state from Tauri app handle
pub fn get_app_state(app_handle: &AppHandle) -> State<'_, AppState> {
    app_handle.state::<AppState>()
}

/// Verify if an overlay window actually exists in Tauri
pub fn verify_overlay_window_exists(app_handle: &AppHandle, display_id: &str) -> bool {
    let window_label = format!("overlay-{}", display_id);
    app_handle.get_webview_window(&window_label).is_some()
}
