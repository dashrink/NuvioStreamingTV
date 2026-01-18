use thiserror::Error;

#[derive(Debug, Error, uniffi::Error)]
pub enum TraktError {
    #[error("API error: {0}")]
    ApiError(String),
    
    #[error("Authentication failed: {0}")]
    AuthError(String),
    
    #[error("Network error: {0}")]
    NetworkError(String),
    
    #[error("Storage error: {0}")]
    StorageError(String),
    
    #[error("Serialization error: {0}")]
    SerializationError(String),
    
    #[error("Invalid parameter: {0}")]
    InvalidParameter(String),
    
    #[error("Rate limited. Retry after {0} seconds")]
    RateLimited(u64),

    #[error("Generic error: {0}")]
    Generic(String),
}

impl From<reqwest::Error> for TraktError {
    fn from(err: reqwest::Error) -> Self {
        TraktError::NetworkError(err.to_string())
    }
}

impl From<serde_json::Error> for TraktError {
    fn from(err: serde_json::Error) -> Self {
        TraktError::SerializationError(err.to_string())
    }
}
