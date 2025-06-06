mod display;

use display::{create_overlay_for_display, get_displays, set_overlay_opacity, toggle_overlay_visibility};
use tauri::Emitter;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            #[cfg(desktop)]
            {
                use tauri::{Manager};
                use tauri_plugin_global_shortcut::{ShortcutState};
                
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
                                    let _ = app.emit("toggle-all-displays", ());
                                } else if shortcut_str.contains("CommandOrControl+Alt+") {
                                    // Extract the number from the shortcut
                                    for i in 1..=4 {
                                        if shortcut_str.contains(&format!("CommandOrControl+Alt+{}", i)) {
                                            let _ = app.emit("toggle-display", i);
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
                    let _ = window.show();
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_displays,
            create_overlay_for_display,
            toggle_overlay_visibility,
            set_overlay_opacity
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
