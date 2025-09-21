use serde::{Deserialize, Serialize};
use std::error::Error;
use std::fmt;

/// IPC error types matching the frontend TypeScript definitions
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "code")]
pub enum IpcErrorCode {
    #[serde(rename = "DISPLAY_NOT_FOUND")]
    DisplayNotFound,
    #[serde(rename = "WINDOW_CREATE_FAILED")]
    WindowCreateFailed,
    #[serde(rename = "INVALID_PARAMETER")]
    InvalidParameter,
    #[serde(rename = "UNKNOWN")]
    Unknown,
}

/// Main error type for IPC communication
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IpcError {
    pub code: IpcErrorCode,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<serde_json::Value>,
}

impl IpcError {
    /// Create a new IpcError
    pub fn new(code: IpcErrorCode, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
            details: None,
        }
    }

    /// Create a new IpcError with details
    pub fn with_details(
        code: IpcErrorCode,
        message: impl Into<String>,
        details: serde_json::Value,
    ) -> Self {
        Self {
            code,
            message: message.into(),
            details: Some(details),
        }
    }

    /// Convert from a generic error
    pub fn from_error<E: Error>(code: IpcErrorCode, error: &E) -> Self {
        Self::new(code, error.to_string())
    }
}

impl fmt::Display for IpcError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}: {}", self.code, self.message)
    }
}

impl Error for IpcError {}

/// Result type for IPC operations
pub type IpcResult<T> = Result<T, IpcError>;

/// Extension trait for converting standard Results to IpcResults
pub trait IntoIpcResult<T> {
    fn into_ipc_result(self, code: IpcErrorCode) -> IpcResult<T>;
}

impl<T, E: Error> IntoIpcResult<T> for Result<T, E> {
    fn into_ipc_result(self, code: IpcErrorCode) -> IpcResult<T> {
        self.map_err(|e| IpcError::from_error(code, &e))
    }
}

/// Convert from tauri::Error to IpcError
impl From<tauri::Error> for IpcError {
    fn from(error: tauri::Error) -> Self {
        match error {
            tauri::Error::WindowLabelAlreadyExists(_) => IpcError::new(
                IpcErrorCode::WindowCreateFailed,
                "Window with this label already exists",
            ),
            _ => IpcError::from_error(IpcErrorCode::Unknown, &error),
        }
    }
}

