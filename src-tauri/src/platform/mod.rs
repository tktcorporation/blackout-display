/**
 * platform/mod.rs
 *
 * Purpose: Platform-specific implementations for overlay windows
 *
 * This module provides platform-specific code for creating and managing
 * overlay windows. Different operating systems require different approaches
 * to achieve transparent, click-through overlay windows.
 *
 * Dependencies:
 * - Windows: Uses windows-rs crate for WinAPI access
 * - macOS: Uses built-in Tauri features
 * - Linux: Uses built-in Tauri features
 */

#[cfg(target_os = "windows")]
pub mod windows;

#[cfg(target_os = "windows")]
pub use self::windows::*;

#[cfg(all(test, target_os = "windows"))]
mod windows_test;
