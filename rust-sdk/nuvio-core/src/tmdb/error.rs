use thiserror::Error;

#[derive(Error, Debug, uniffi::Error)]
pub enum TmdbError {
    #[error("Network error: {0}")]
    Network(String),
    #[error("Serialization error: {0}")]
    Serialization(String),
    #[error("Storage error: {0}")]
    Storage(String),
    #[error("Configuration error: {0}")]
    Config(String),
    #[error("Not found")]
    NotFound,
    #[error("Generic error: {0}")]
    Generic(String),
}

impl From<reqwest::Error> for TmdbError {
    fn from(e: reqwest::Error) -> Self {
        TmdbError::Network(e.to_string())
    }
}

impl From<serde_json::Error> for TmdbError {
    fn from(e: serde_json::Error) -> Self {
        TmdbError::Serialization(e.to_string())
    }
}
