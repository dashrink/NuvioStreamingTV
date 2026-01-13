//! Error types for the HTTP networking layer.
//!
//! This module defines HTTP-specific error types that can safely cross FFI boundaries using UniFFI.
//! All error variants use named fields (no tuple variants) as required by UniFFI.
//!
//! # Error Categories
//!
//! - [`HttpError::NetworkError`] - Network-level failures (DNS, connection refused, etc.)
//! - [`HttpError::TimeoutError`] - Request or connection timeouts
//! - [`HttpError::HttpStatusError`] - HTTP 4xx/5xx status code errors
//! - [`HttpError::TlsError`] - TLS/SSL certificate validation errors
//! - [`HttpError::CancellationError`] - Request was cancelled by user
//! - [`HttpError::ConfigurationError`] - Invalid client configuration
//! - [`HttpError::Unknown`] - Unexpected or unclassified errors
//!
//! # Usage
//!
//! ```rust,no_run
//! use nuvio_core::http::error::HttpError;
//!
//! // Create errors using helper methods
//! let timeout_err = HttpError::timeout("Request took too long");
//! let network_err = HttpError::network(1, "DNS resolution failed");
//! let status_err = HttpError::http_status(404, "Not Found");
//!
//! // Errors can be converted from reqwest::Error automatically
//! // let result: Result<Response, HttpError> = client.get(url).send().await.map_err(Into::into);
//! ```

use thiserror::Error;
use uniffi;

/// Error types that can occur during HTTP operations.
///
/// All variants use named fields to ensure compatibility with UniFFI's FFI layer.
/// These errors can be safely propagated across language boundaries to Kotlin and Swift.
///
/// Error codes for NetworkError:
/// - 0: General network error
/// - 1: DNS resolution failure
/// - 2: Connection refused
/// - 3: Connection reset
/// - 4: Other connection error
#[derive(uniffi::Error, Debug, Error)]
pub enum HttpError {
    /// Network-level error (DNS, connection, etc.)
    #[error("Network error (code {code}): {msg}")]
    NetworkError {
        /// Error code indicating the type of network failure
        code: i32,
        /// Detailed error message describing what went wrong
        msg: String,
    },

    /// Request or connection timeout
    #[error("Timeout error: {msg}")]
    TimeoutError {
        /// Detailed error message describing the timeout
        msg: String,
    },

    /// HTTP status code error (4xx or 5xx)
    #[error("HTTP {status_code} error: {msg}")]
    HttpStatusError {
        /// HTTP status code (e.g., 404, 500)
        status_code: u16,
        /// Detailed error message or response body
        msg: String,
    },

    /// TLS/SSL certificate validation error
    #[error("TLS error: {msg}")]
    TlsError {
        /// Detailed error message describing the TLS error
        msg: String,
    },

    /// Request was cancelled by the user
    #[error("Request cancelled: {msg}")]
    CancellationError {
        /// Detailed error message about the cancellation
        msg: String,
    },

    /// Invalid HTTP client configuration
    #[error("Configuration error: {msg}")]
    ConfigurationError {
        /// Detailed error message describing the configuration issue
        msg: String,
    },

    /// Unknown or unexpected error
    #[error("Unknown HTTP error: {msg}")]
    Unknown {
        /// Detailed error message describing the error
        msg: String,
    },
}

impl HttpError {
    /// Creates a new NetworkError with the given code and message
    pub fn network(code: i32, msg: impl Into<String>) -> Self {
        Self::NetworkError {
            code,
            msg: msg.into(),
        }
    }

    /// Creates a new TimeoutError with the given message
    pub fn timeout(msg: impl Into<String>) -> Self {
        Self::TimeoutError { msg: msg.into() }
    }

    /// Creates a new HttpStatusError with the given status code and message
    pub fn http_status(status_code: u16, msg: impl Into<String>) -> Self {
        Self::HttpStatusError {
            status_code,
            msg: msg.into(),
        }
    }

    /// Creates a new TlsError with the given message
    pub fn tls(msg: impl Into<String>) -> Self {
        Self::TlsError { msg: msg.into() }
    }

    /// Creates a new CancellationError with the given message
    pub fn cancellation(msg: impl Into<String>) -> Self {
        Self::CancellationError { msg: msg.into() }
    }

    /// Creates a new ConfigurationError with the given message
    pub fn configuration(msg: impl Into<String>) -> Self {
        Self::ConfigurationError { msg: msg.into() }
    }

    /// Creates a new Unknown error with the given message
    pub fn unknown(msg: impl Into<String>) -> Self {
        Self::Unknown { msg: msg.into() }
    }
}

/// Convert from reqwest::Error to HttpError
///
/// This implementation maps reqwest errors to appropriate HttpError variants:
/// - Timeout errors → TimeoutError
/// - Connection errors → NetworkError
/// - HTTP status codes → HttpStatusError
/// - Other errors → Unknown
impl From<reqwest::Error> for HttpError {
    fn from(err: reqwest::Error) -> Self {
        // Check for timeout errors
        if err.is_timeout() {
            return Self::TimeoutError {
                msg: err.to_string(),
            };
        }

        // Check for connection errors
        if err.is_connect() {
            let msg = err.to_string();
            // Try to determine specific connection error type
            let code = if msg.contains("dns") || msg.contains("DNS") {
                1 // DNS resolution failure
            } else if msg.contains("refused") {
                2 // Connection refused
            } else if msg.contains("reset") {
                3 // Connection reset
            } else {
                4 // Other connection error
            };
            return Self::NetworkError { code, msg };
        }

        // Check for HTTP status code errors
        if let Some(status) = err.status() {
            return Self::HttpStatusError {
                status_code: status.as_u16(),
                msg: err.to_string(),
            };
        }

        // Check for request errors (general network issues)
        if err.is_request() {
            return Self::NetworkError {
                code: 0,
                msg: err.to_string(),
            };
        }

        // Default to Unknown for other errors
        Self::Unknown {
            msg: err.to_string(),
        }
    }
}

/// Convert from reqwest_middleware::Error to HttpError
///
/// This implementation handles errors from the middleware-wrapped HTTP client.
/// Most reqwest_middleware errors wrap an underlying reqwest::Error, which we
/// extract and convert using the existing From<reqwest::Error> implementation.
impl From<reqwest_middleware::Error> for HttpError {
    fn from(err: reqwest_middleware::Error) -> Self {
        match err {
            // Middleware errors usually wrap a reqwest error
            reqwest_middleware::Error::Reqwest(reqwest_err) => Self::from(reqwest_err),
            // Middleware-specific errors (from retry logic, etc.)
            reqwest_middleware::Error::Middleware(middleware_err) => {
                Self::Unknown {
                    msg: middleware_err.to_string(),
                }
            }
        }
    }
}

/// Convert from TlsConfigError to HttpError
impl From<crate::http::tls::TlsConfigError> for HttpError {
    fn from(err: crate::http::tls::TlsConfigError) -> Self {
        Self::TlsError {
            msg: err.to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_network_error() {
        let error = HttpError::network(1, "DNS resolution failed");

        match error {
            HttpError::NetworkError { code, msg } => {
                assert_eq!(code, 1);
                assert_eq!(msg, "DNS resolution failed");
            }
            _ => panic!("Expected NetworkError"),
        }
    }

    #[test]
    fn test_timeout_error() {
        let error = HttpError::timeout("Request timed out after 30s");

        match error {
            HttpError::TimeoutError { msg } => {
                assert_eq!(msg, "Request timed out after 30s");
            }
            _ => panic!("Expected TimeoutError"),
        }
    }

    #[test]
    fn test_http_status_error() {
        let error = HttpError::http_status(404, "Not Found");

        match error {
            HttpError::HttpStatusError { status_code, msg } => {
                assert_eq!(status_code, 404);
                assert_eq!(msg, "Not Found");
            }
            _ => panic!("Expected HttpStatusError"),
        }
    }

    #[test]
    fn test_tls_error() {
        let error = HttpError::tls("Certificate validation failed");

        match error {
            HttpError::TlsError { msg } => {
                assert_eq!(msg, "Certificate validation failed");
            }
            _ => panic!("Expected TlsError"),
        }
    }

    #[test]
    fn test_cancellation_error() {
        let error = HttpError::cancellation("Request was aborted");

        match error {
            HttpError::CancellationError { msg } => {
                assert_eq!(msg, "Request was aborted");
            }
            _ => panic!("Expected CancellationError"),
        }
    }

    #[test]
    fn test_configuration_error() {
        let error = HttpError::configuration("Invalid timeout value");

        match error {
            HttpError::ConfigurationError { msg } => {
                assert_eq!(msg, "Invalid timeout value");
            }
            _ => panic!("Expected ConfigurationError"),
        }
    }

    #[test]
    fn test_unknown_error() {
        let error = HttpError::unknown("Something unexpected happened");

        match error {
            HttpError::Unknown { msg } => {
                assert_eq!(msg, "Something unexpected happened");
            }
            _ => panic!("Expected Unknown error"),
        }
    }

    #[test]
    fn test_error_display() {
        // Test that error messages display correctly using thiserror
        let network_error = HttpError::network(1, "DNS failed");
        assert_eq!(
            format!("{}", network_error),
            "Network error (code 1): DNS failed"
        );

        let timeout_error = HttpError::timeout("Timeout");
        assert_eq!(format!("{}", timeout_error), "Timeout error: Timeout");

        let status_error = HttpError::http_status(404, "Not Found");
        assert_eq!(format!("{}", status_error), "HTTP 404 error: Not Found");

        let tls_error = HttpError::tls("Invalid cert");
        assert_eq!(format!("{}", tls_error), "TLS error: Invalid cert");

        let cancel_error = HttpError::cancellation("Aborted");
        assert_eq!(format!("{}", cancel_error), "Request cancelled: Aborted");

        let config_error = HttpError::configuration("Bad config");
        assert_eq!(
            format!("{}", config_error),
            "Configuration error: Bad config"
        );

        let unknown_error = HttpError::unknown("Unknown");
        assert_eq!(format!("{}", unknown_error), "Unknown HTTP error: Unknown");
    }

    #[test]
    fn test_error_debug() {
        // Verify Debug trait works correctly
        let error = HttpError::network(1, "Debug test");
        let debug_string = format!("{:?}", error);

        assert!(debug_string.contains("NetworkError"));
        assert!(debug_string.contains("Debug test"));
    }

    #[test]
    fn test_error_variants_construct() {
        // Test that all error variants can be constructed with named fields
        let network = HttpError::NetworkError {
            code: 1,
            msg: "test".to_string(),
        };
        let timeout = HttpError::TimeoutError {
            msg: "test".to_string(),
        };
        let status = HttpError::HttpStatusError {
            status_code: 404,
            msg: "test".to_string(),
        };
        let tls = HttpError::TlsError {
            msg: "test".to_string(),
        };
        let cancel = HttpError::CancellationError {
            msg: "test".to_string(),
        };
        let config = HttpError::ConfigurationError {
            msg: "test".to_string(),
        };
        let unknown = HttpError::Unknown {
            msg: "test".to_string(),
        };

        // Verify they're the correct variant
        assert!(matches!(network, HttpError::NetworkError { .. }));
        assert!(matches!(timeout, HttpError::TimeoutError { .. }));
        assert!(matches!(status, HttpError::HttpStatusError { .. }));
        assert!(matches!(tls, HttpError::TlsError { .. }));
        assert!(matches!(cancel, HttpError::CancellationError { .. }));
        assert!(matches!(config, HttpError::ConfigurationError { .. }));
        assert!(matches!(unknown, HttpError::Unknown { .. }));
    }

    #[test]
    fn test_helper_methods() {
        // Test that helper methods create the correct variants
        let error1 = HttpError::network(1, "test1");
        let error2 = HttpError::timeout("test2");
        let error3 = HttpError::http_status(500, "test3");
        let error4 = HttpError::tls("test4");
        let error5 = HttpError::cancellation("test5");
        let error6 = HttpError::configuration("test6");
        let error7 = HttpError::unknown("test7");

        assert!(matches!(error1, HttpError::NetworkError { .. }));
        assert!(matches!(error2, HttpError::TimeoutError { .. }));
        assert!(matches!(error3, HttpError::HttpStatusError { .. }));
        assert!(matches!(error4, HttpError::TlsError { .. }));
        assert!(matches!(error5, HttpError::CancellationError { .. }));
        assert!(matches!(error6, HttpError::ConfigurationError { .. }));
        assert!(matches!(error7, HttpError::Unknown { .. }));
    }

    #[test]
    fn test_string_conversion() {
        // Test that &str and String both work with helper methods
        let error1 = HttpError::timeout("string slice");
        let error2 = HttpError::timeout(String::from("owned string"));

        match error1 {
            HttpError::TimeoutError { msg } => assert_eq!(msg, "string slice"),
            _ => panic!("Expected TimeoutError"),
        }

        match error2 {
            HttpError::TimeoutError { msg } => assert_eq!(msg, "owned string"),
            _ => panic!("Expected TimeoutError"),
        }
    }

    #[test]
    fn test_network_error_codes() {
        // Test different network error codes
        let dns_error = HttpError::network(1, "DNS resolution failed");
        let refused_error = HttpError::network(2, "Connection refused");
        let reset_error = HttpError::network(3, "Connection reset");
        let other_error = HttpError::network(4, "Other connection error");

        match dns_error {
            HttpError::NetworkError { code, .. } => assert_eq!(code, 1),
            _ => panic!("Expected NetworkError"),
        }

        match refused_error {
            HttpError::NetworkError { code, .. } => assert_eq!(code, 2),
            _ => panic!("Expected NetworkError"),
        }

        match reset_error {
            HttpError::NetworkError { code, .. } => assert_eq!(code, 3),
            _ => panic!("Expected NetworkError"),
        }

        match other_error {
            HttpError::NetworkError { code, .. } => assert_eq!(code, 4),
            _ => panic!("Expected NetworkError"),
        }
    }

    #[test]
    fn test_http_status_codes() {
        // Test various HTTP status codes
        let error_404 = HttpError::http_status(404, "Not Found");
        let error_500 = HttpError::http_status(500, "Internal Server Error");
        let error_503 = HttpError::http_status(503, "Service Unavailable");

        match error_404 {
            HttpError::HttpStatusError { status_code, .. } => assert_eq!(status_code, 404),
            _ => panic!("Expected HttpStatusError"),
        }

        match error_500 {
            HttpError::HttpStatusError { status_code, .. } => assert_eq!(status_code, 500),
            _ => panic!("Expected HttpStatusError"),
        }

        match error_503 {
            HttpError::HttpStatusError { status_code, .. } => assert_eq!(status_code, 503),
            _ => panic!("Expected HttpStatusError"),
        }
    }

    // VERIFICATION TEST: test_error_types_network_failure
    #[test]
    fn test_error_types_network_failure() {
        // Test different types of network failures
        let dns_failure = HttpError::network(1, "DNS resolution failed for example.com");
        let connection_refused = HttpError::network(2, "Connection refused by server");
        let connection_reset = HttpError::network(3, "Connection was reset by peer");
        let general_network = HttpError::network(0, "General network error");

        // Verify DNS failure
        match &dns_failure {
            HttpError::NetworkError { code, msg } => {
                assert_eq!(*code, 1);
                assert!(msg.contains("DNS"));
                assert!(msg.contains("example.com"));
            }
            _ => panic!("Expected NetworkError for DNS failure"),
        }

        // Verify connection refused
        match &connection_refused {
            HttpError::NetworkError { code, msg } => {
                assert_eq!(*code, 2);
                assert!(msg.contains("refused"));
            }
            _ => panic!("Expected NetworkError for connection refused"),
        }

        // Verify connection reset
        match &connection_reset {
            HttpError::NetworkError { code, msg } => {
                assert_eq!(*code, 3);
                assert!(msg.contains("reset"));
            }
            _ => panic!("Expected NetworkError for connection reset"),
        }

        // Verify general network error
        match &general_network {
            HttpError::NetworkError { code, msg } => {
                assert_eq!(*code, 0);
                assert!(msg.contains("network"));
            }
            _ => panic!("Expected NetworkError for general network error"),
        }

        // Test error display
        assert!(format!("{}", dns_failure).contains("Network error"));
        assert!(format!("{}", connection_refused).contains("code 2"));
    }

    // VERIFICATION TEST: test_error_types_timeout
    #[test]
    fn test_error_types_timeout() {
        // Test different types of timeout errors
        let request_timeout = HttpError::timeout("Request timed out after 30 seconds");
        let connect_timeout = HttpError::timeout("Connection attempt timed out after 10 seconds");
        let read_timeout = HttpError::timeout("Read operation timed out");

        // Verify request timeout
        match &request_timeout {
            HttpError::TimeoutError { msg } => {
                assert!(msg.contains("Request"));
                assert!(msg.contains("30 seconds"));
            }
            _ => panic!("Expected TimeoutError for request timeout"),
        }

        // Verify connect timeout
        match &connect_timeout {
            HttpError::TimeoutError { msg } => {
                assert!(msg.contains("Connection"));
                assert!(msg.contains("10 seconds"));
            }
            _ => panic!("Expected TimeoutError for connect timeout"),
        }

        // Verify read timeout
        match &read_timeout {
            HttpError::TimeoutError { msg } => {
                assert!(msg.contains("Read"));
                assert!(msg.contains("timed out"));
            }
            _ => panic!("Expected TimeoutError for read timeout"),
        }

        // Test error display
        assert_eq!(
            format!("{}", request_timeout),
            "Timeout error: Request timed out after 30 seconds"
        );
        assert_eq!(
            format!("{}", connect_timeout),
            "Timeout error: Connection attempt timed out after 10 seconds"
        );

        // Test that timeout errors are distinct from network errors
        assert!(matches!(request_timeout, HttpError::TimeoutError { .. }));
        assert!(!matches!(request_timeout, HttpError::NetworkError { .. }));
    }

    #[test]
    fn test_error_types_http_status() {
        // Test HTTP status code error mapping
        let error_400 = HttpError::http_status(400, "Bad Request");
        let error_401 = HttpError::http_status(401, "Unauthorized");
        let error_404 = HttpError::http_status(404, "Not Found");
        let error_500 = HttpError::http_status(500, "Internal Server Error");
        let error_502 = HttpError::http_status(502, "Bad Gateway");
        let error_503 = HttpError::http_status(503, "Service Unavailable");

        // Verify 4xx errors
        match error_400 {
            HttpError::HttpStatusError { status_code, msg } => {
                assert_eq!(status_code, 400);
                assert_eq!(msg, "Bad Request");
            }
            _ => panic!("Expected HttpStatusError"),
        }

        match error_404 {
            HttpError::HttpStatusError { status_code, .. } => {
                assert_eq!(status_code, 404);
            }
            _ => panic!("Expected HttpStatusError"),
        }

        // Verify 5xx errors
        match &error_500 {
            HttpError::HttpStatusError { status_code, msg } => {
                assert_eq!(*status_code, 500);
                assert_eq!(msg, "Internal Server Error");
            }
            _ => panic!("Expected HttpStatusError"),
        }

        match &error_503 {
            HttpError::HttpStatusError { status_code, .. } => {
                assert_eq!(*status_code, 503);
            }
            _ => panic!("Expected HttpStatusError"),
        }

        // Test error display
        assert_eq!(format!("{}", error_404), "HTTP 404 error: Not Found");
        assert_eq!(
            format!("{}", error_500),
            "HTTP 500 error: Internal Server Error"
        );
    }
}
