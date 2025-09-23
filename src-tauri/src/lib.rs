mod display;
mod error;
pub mod platform;
mod recovery;
mod state;

use display::{
    create_overlay_for_display, get_displays, set_overlay_opacity, toggle_overlay_visibility,
};
use recovery::{
    cleanup_orphaned_states, force_recreate_overlay, get_overlay_states,
    verify_and_recover_overlays,
};
use state::AppState;
use tauri::Emitter;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::new())
        .setup(|app| {
            #[cfg(desktop)]
            {
                use tauri::Manager;
                use tauri_plugin_global_shortcut::ShortcutState;

                // Register global shortcuts
                app.handle().plugin(
                    tauri_plugin_global_shortcut::Builder::new()
                        .with_shortcuts([
                            "CommandOrControl+Shift+B",
                            "CommandOrControl+Alt+1",
                            "CommandOrControl+Alt+2",
                            "CommandOrControl+Alt+3",
                            "CommandOrControl+Alt+4",
                        ])?
                        .with_handler(|app, shortcut, event| {
                            if event.state == ShortcutState::Pressed {
                                let shortcut_str = format!("{:?}", shortcut);
                                if shortcut_str.contains("CommandOrControl+Shift+B") {
                                    if let Err(e) = app.emit("toggle-all-displays", ()) {
                                        eprintln!(
                                            "Failed to emit toggle-all-displays event: {}",
                                            e
                                        );
                                    }
                                } else if shortcut_str.contains("CommandOrControl+Alt+") {
                                    // Extract the number from the shortcut
                                    for i in 1..=4 {
                                        if shortcut_str
                                            .contains(&format!("CommandOrControl+Alt+{}", i))
                                        {
                                            if let Err(e) = app.emit("toggle-display", i) {
                                                eprintln!(
                                                    "Failed to emit toggle-display event: {}",
                                                    e
                                                );
                                            }
                                            break;
                                        }
                                    }
                                }
                            }
                        })
                        .build(),
                )?;

                // Show main control window after setup
                if let Some(window) = app.get_webview_window("main") {
                    // Ensure main window accepts cursor events (not click-through)
                    if let Err(e) = window.set_ignore_cursor_events(false) {
                        eprintln!("Failed to set main window cursor events: {}", e);
                    }
                    if let Err(e) = window.show() {
                        eprintln!("Failed to show main window: {}", e);
                    }
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_displays,
            create_overlay_for_display,
            toggle_overlay_visibility,
            set_overlay_opacity,
            verify_and_recover_overlays,
            get_overlay_states,
            cleanup_orphaned_states,
            force_recreate_overlay
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
