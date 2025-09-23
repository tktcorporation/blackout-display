use std::env;
use std::fs;
use std::path::Path;

fn main() {
    tauri_build::build();

    // Generate IPC metadata in development builds
    if env::var("PROFILE").unwrap_or_default() == "debug" {
        generate_ipc_metadata();
    }
}

/// Generate metadata about IPC commands for interface validation
fn generate_ipc_metadata() {
    let metadata = r#"{
  "commands": {
    "get_displays": {
      "params": [],
      "returns": "Vec<Display>"
    },
    "create_overlay_for_display": {
      "params": [
        {
          "name": "displayId",
          "type": "String",
          "camelCase": true
        }
      ],
      "returns": "()"
    },
    "toggle_overlay_visibility": {
      "params": [
        {
          "name": "displayId",
          "type": "String",
          "camelCase": true
        },
        {
          "name": "visible",
          "type": "bool",
          "camelCase": false
        }
      ],
      "returns": "()"
    },
    "set_overlay_opacity": {
      "params": [
        {
          "name": "displayId",
          "type": "String",
          "camelCase": true
        },
        {
          "name": "opacity",
          "type": "f32",
          "camelCase": false
        }
      ],
      "returns": "()"
    },
    "verify_and_recover_overlays": {
      "params": [],
      "returns": "Vec<String>"
    },
    "get_overlay_states": {
      "params": [],
      "returns": "Vec<OverlayState>"
    },
    "cleanup_orphaned_states": {
      "params": [],
      "returns": "Vec<String>"
    },
    "force_recreate_overlay": {
      "params": [
        {
          "name": "displayId",
          "type": "String",
          "camelCase": true
        }
      ],
      "returns": "()"
    }
  },
  "events": {
    "toggle-all-displays": {
      "payload": "void"
    },
    "toggle-display": {
      "payload": "number"
    },
    "opacity-update": {
      "payload": "number"
    }
  }
}"#;

    // Write metadata to a file that can be read by tests
    let out_dir = env::var("OUT_DIR").unwrap();
    let dest_path = Path::new(&out_dir).join("ipc_metadata.json");
    fs::write(&dest_path, metadata).unwrap();

    // Also write to the project root for easier access during development
    if let Ok(manifest_dir) = env::var("CARGO_MANIFEST_DIR") {
        let project_metadata_path = Path::new(&manifest_dir)
            .parent()
            .unwrap()
            .join("ipc_metadata.json");
        fs::write(&project_metadata_path, metadata).unwrap();
    }

    println!("cargo:rerun-if-changed=src/display.rs");
    println!("cargo:rerun-if-changed=src/recovery.rs");
    println!("cargo:rerun-if-changed=src/lib.rs");
}
