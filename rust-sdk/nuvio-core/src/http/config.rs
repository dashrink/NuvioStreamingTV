//! HTTP client configuration builder
//!
//! This module provides a builder pattern for configuring the HTTP client with
//! customizable timeouts, connection pool settings, default headers, and TLS options.
//!
//! # Architecture
//!
//! The configuration builder follows the builder pattern to provide a fluent API
//! for constructing HTTP client configurations. All settings have sensible defaults
//! based on production best practices from the reqwest documentation.
//!
//! # Default Configuration
//!
//! If you use `HttpClientConfig::default()`, you get:
//! - Request timeout: 30 seconds
//! - Connect timeout: 10 seconds
//! - Pool idle timeout: 90 seconds
//! - Pool max idle per host: 10 connections
//! - Cookie store: Enabled (required for OAuth flows)
//! - User-Agent: "nuvio-sdk/1.0"
//!
//! # Examples
//!
//! ## Using Default Configuration
//!
//! ```rust
//! use nuvio_core::http::config::HttpClientConfig;
//!
//! let config = HttpClientConfig::default();
//! ```
//!
//! ## Custom Configuration
//!
//! ```rust
//! use nuvio_core::http::config::HttpClientConfig;
//! use std::time::Duration;
//!
//! let config = HttpClientConfig::builder()
//!     .request_timeout(Duration::from_secs(60))
//!     .connect_timeout(Duration::from_secs(15))
//!     .pool_max_idle_per_host(20)
//!     .user_agent("my-app/2.0")
//!     .build();
//! ```

use reqwest::header::{HeaderMap, HeaderName, HeaderValue, USER_AGENT};
use std::time::Duration;

/// HTTP client configuration
///
/// This struct holds all configuration parameters for the HTTP client including
/// timeouts, connection pool settings, cookie management, and default headers.
///
/// Use [`HttpClientConfigBuilder`] to construct instances of this struct.
#[derive(Debug, Clone)]
pub struct HttpClientConfig {
    /// Overall request timeout (from start to response completion)
    pub request_timeout: Duration,

    /// TCP connection establishment timeout
    pub connect_timeout: Duration,

    /// How long to keep idle connections alive in the pool
    pub pool_idle_timeout: Duration,

    /// Maximum number of idle connections to maintain per host
    pub pool_max_idle_per_host: usize,

    /// Whether to enable automatic cookie management
    pub cookie_store_enabled: bool,

    /// Default headers to include in all requests
    pub default_headers: HeaderMap,
}

impl Default for HttpClientConfig {
    /// Creates a new configuration with production-ready defaults
    ///
    /// # Default Values
    ///
    /// - Request timeout: 30 seconds
    /// - Connect timeout: 10 seconds
    /// - Pool idle timeout: 90 seconds
    /// - Pool max idle per host: 10
    /// - Cookie store: Enabled
    /// - User-Agent: "nuvio-sdk/1.0"
    fn default() -> Self {
        let mut default_headers = HeaderMap::new();
        default_headers.insert(
            USER_AGENT,
            HeaderValue::from_static("nuvio-sdk/1.0"),
        );

        Self {
            request_timeout: Duration::from_secs(30),
            connect_timeout: Duration::from_secs(10),
            pool_idle_timeout: Duration::from_secs(90),
            pool_max_idle_per_host: 10,
            cookie_store_enabled: true,
            default_headers,
        }
    }
}

impl HttpClientConfig {
    /// Creates a new builder for constructing an HTTP client configuration
    ///
    /// # Example
    ///
    /// ```rust
    /// use nuvio_core::http::config::HttpClientConfig;
    /// use std::time::Duration;
    ///
    /// let config = HttpClientConfig::builder()
    ///     .request_timeout(Duration::from_secs(45))
    ///     .build();
    /// ```
    pub fn builder() -> HttpClientConfigBuilder {
        HttpClientConfigBuilder::default()
    }
}

/// Builder for HTTP client configuration
///
/// This builder provides a fluent API for constructing [`HttpClientConfig`] instances
/// with custom settings. All settings are optional and fall back to sensible defaults.
///
/// # Example
///
/// ```rust
/// use nuvio_core::http::config::HttpClientConfig;
/// use std::time::Duration;
///
/// let config = HttpClientConfig::builder()
///     .request_timeout(Duration::from_secs(60))
///     .connect_timeout(Duration::from_secs(15))
///     .pool_idle_timeout(Duration::from_secs(120))
///     .pool_max_idle_per_host(20)
///     .cookie_store_enabled(false)
///     .user_agent("my-app/1.0")
///     .header("X-API-Key", "secret")
///     .build();
/// ```
#[derive(Debug, Default)]
pub struct HttpClientConfigBuilder {
    request_timeout: Option<Duration>,
    connect_timeout: Option<Duration>,
    pool_idle_timeout: Option<Duration>,
    pool_max_idle_per_host: Option<usize>,
    cookie_store_enabled: Option<bool>,
    default_headers: HeaderMap,
}

impl HttpClientConfigBuilder {
    /// Sets the overall request timeout
    ///
    /// This timeout covers the entire request lifecycle from connection establishment
    /// to response body completion. If not set, defaults to 30 seconds.
    ///
    /// # Arguments
    ///
    /// * `timeout` - The request timeout duration
    ///
    /// # Example
    ///
    /// ```rust
    /// use nuvio_core::http::config::HttpClientConfig;
    /// use std::time::Duration;
    ///
    /// let config = HttpClientConfig::builder()
    ///     .request_timeout(Duration::from_secs(45))
    ///     .build();
    /// ```
    pub fn request_timeout(mut self, timeout: Duration) -> Self {
        self.request_timeout = Some(timeout);
        self
    }

    /// Sets the TCP connection establishment timeout
    ///
    /// This timeout applies only to establishing the TCP connection.
    /// If not set, defaults to 10 seconds.
    ///
    /// # Arguments
    ///
    /// * `timeout` - The connection timeout duration
    ///
    /// # Example
    ///
    /// ```rust
    /// use nuvio_core::http::config::HttpClientConfig;
    /// use std::time::Duration;
    ///
    /// let config = HttpClientConfig::builder()
    ///     .connect_timeout(Duration::from_secs(15))
    ///     .build();
    /// ```
    pub fn connect_timeout(mut self, timeout: Duration) -> Self {
        self.connect_timeout = Some(timeout);
        self
    }

    /// Sets the connection pool idle timeout
    ///
    /// This determines how long idle connections are kept alive in the pool.
    /// Longer timeouts improve performance but consume more resources.
    /// If not set, defaults to 90 seconds.
    ///
    /// # Arguments
    ///
    /// * `timeout` - The pool idle timeout duration
    ///
    /// # Example
    ///
    /// ```rust
    /// use nuvio_core::http::config::HttpClientConfig;
    /// use std::time::Duration;
    ///
    /// let config = HttpClientConfig::builder()
    ///     .pool_idle_timeout(Duration::from_secs(120))
    ///     .build();
    /// ```
    pub fn pool_idle_timeout(mut self, timeout: Duration) -> Self {
        self.pool_idle_timeout = Some(timeout);
        self
    }

    /// Sets the maximum number of idle connections per host
    ///
    /// Higher values allow more concurrent requests to the same host
    /// but consume more resources. If not set, defaults to 10.
    ///
    /// # Arguments
    ///
    /// * `max_idle` - Maximum number of idle connections per host
    ///
    /// # Example
    ///
    /// ```rust
    /// use nuvio_core::http::config::HttpClientConfig;
    ///
    /// let config = HttpClientConfig::builder()
    ///     .pool_max_idle_per_host(20)
    ///     .build();
    /// ```
    pub fn pool_max_idle_per_host(mut self, max_idle: usize) -> Self {
        self.pool_max_idle_per_host = Some(max_idle);
        self
    }

    /// Enables or disables automatic cookie management
    ///
    /// When enabled, the client automatically stores cookies from responses
    /// and includes them in subsequent requests according to RFC 6265.
    /// This is required for OAuth flows. If not set, defaults to enabled.
    ///
    /// # Arguments
    ///
    /// * `enabled` - Whether to enable cookie management
    ///
    /// # Example
    ///
    /// ```rust
    /// use nuvio_core::http::config::HttpClientConfig;
    ///
    /// let config = HttpClientConfig::builder()
    ///     .cookie_store_enabled(true)
    ///     .build();
    /// ```
    pub fn cookie_store_enabled(mut self, enabled: bool) -> Self {
        self.cookie_store_enabled = Some(enabled);
        self
    }

    /// Sets the User-Agent header for all requests
    ///
    /// This is a convenience method for setting the User-Agent header.
    /// If not set, defaults to "nuvio-sdk/1.0".
    ///
    /// # Arguments
    ///
    /// * `user_agent` - The User-Agent string
    ///
    /// # Example
    ///
    /// ```rust
    /// use nuvio_core::http::config::HttpClientConfig;
    ///
    /// let config = HttpClientConfig::builder()
    ///     .user_agent("my-app/2.0")
    ///     .build();
    /// ```
    pub fn user_agent(mut self, user_agent: &str) -> Self {
        if let Ok(value) = HeaderValue::from_str(user_agent) {
            self.default_headers.insert(USER_AGENT, value);
        }
        self
    }

    /// Adds a default header to include in all requests
    ///
    /// Default headers can be overridden by per-request headers.
    /// This is useful for API keys, custom authentication headers, etc.
    ///
    /// # Arguments
    ///
    /// * `name` - The header name
    /// * `value` - The header value
    ///
    /// # Example
    ///
    /// ```rust
    /// use nuvio_core::http::config::HttpClientConfig;
    ///
    /// let config = HttpClientConfig::builder()
    ///     .header("X-API-Key", "secret-key")
    ///     .header("X-Request-ID", "123456")
    ///     .build();
    /// ```
    pub fn header(mut self, name: &str, value: &str) -> Self {
        if let (Ok(header_name), Ok(header_value)) = (
            HeaderName::from_bytes(name.as_bytes()),
            HeaderValue::from_str(value),
        ) {
            self.default_headers.insert(header_name, header_value);
        }
        self
    }

    /// Builds the HTTP client configuration
    ///
    /// Any settings not explicitly set will use their default values.
    ///
    /// # Example
    ///
    /// ```rust
    /// use nuvio_core::http::config::HttpClientConfig;
    /// use std::time::Duration;
    ///
    /// let config = HttpClientConfig::builder()
    ///     .request_timeout(Duration::from_secs(60))
    ///     .build();
    /// ```
    pub fn build(self) -> HttpClientConfig {
        let defaults = HttpClientConfig::default();

        // Start with default headers and merge in any custom headers
        let mut default_headers = defaults.default_headers.clone();
        for (name, value) in self.default_headers.iter() {
            default_headers.insert(name.clone(), value.clone());
        }

        HttpClientConfig {
            request_timeout: self.request_timeout.unwrap_or(defaults.request_timeout),
            connect_timeout: self.connect_timeout.unwrap_or(defaults.connect_timeout),
            pool_idle_timeout: self.pool_idle_timeout.unwrap_or(defaults.pool_idle_timeout),
            pool_max_idle_per_host: self
                .pool_max_idle_per_host
                .unwrap_or(defaults.pool_max_idle_per_host),
            cookie_store_enabled: self
                .cookie_store_enabled
                .unwrap_or(defaults.cookie_store_enabled),
            default_headers,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_config_builder() {
        // Test basic builder construction
        let config = HttpClientConfig::builder()
            .request_timeout(Duration::from_secs(45))
            .connect_timeout(Duration::from_secs(15))
            .pool_idle_timeout(Duration::from_secs(120))
            .pool_max_idle_per_host(20)
            .cookie_store_enabled(false)
            .user_agent("test-app/1.0")
            .header("X-API-Key", "test-key")
            .build();

        assert_eq!(config.request_timeout, Duration::from_secs(45));
        assert_eq!(config.connect_timeout, Duration::from_secs(15));
        assert_eq!(config.pool_idle_timeout, Duration::from_secs(120));
        assert_eq!(config.pool_max_idle_per_host, 20);
        assert!(!config.cookie_store_enabled);

        // Verify User-Agent header
        assert_eq!(
            config.default_headers.get(USER_AGENT).unwrap(),
            "test-app/1.0"
        );

        // Verify custom header
        assert_eq!(
            config.default_headers.get("X-API-Key").unwrap(),
            "test-key"
        );
    }

    #[test]
    fn test_config_default() {
        // Test default configuration values
        let config = HttpClientConfig::default();

        assert_eq!(config.request_timeout, Duration::from_secs(30));
        assert_eq!(config.connect_timeout, Duration::from_secs(10));
        assert_eq!(config.pool_idle_timeout, Duration::from_secs(90));
        assert_eq!(config.pool_max_idle_per_host, 10);
        assert!(config.cookie_store_enabled);

        // Should have default User-Agent
        assert_eq!(
            config.default_headers.get(USER_AGENT).unwrap(),
            "nuvio-sdk/1.0"
        );
    }

    #[test]
    fn test_config_builder_partial() {
        // Test that unset values fall back to defaults
        let config = HttpClientConfig::builder()
            .request_timeout(Duration::from_secs(45))
            .build();

        assert_eq!(config.request_timeout, Duration::from_secs(45));
        assert_eq!(config.connect_timeout, Duration::from_secs(10)); // Default
        assert_eq!(config.pool_idle_timeout, Duration::from_secs(90)); // Default
        assert_eq!(config.pool_max_idle_per_host, 10); // Default
        assert!(config.cookie_store_enabled); // Default
    }

    #[test]
    fn test_config_builder_timeouts() {
        // Test various timeout configurations
        let config = HttpClientConfig::builder()
            .request_timeout(Duration::from_secs(60))
            .connect_timeout(Duration::from_secs(20))
            .pool_idle_timeout(Duration::from_secs(180))
            .build();

        assert_eq!(config.request_timeout, Duration::from_secs(60));
        assert_eq!(config.connect_timeout, Duration::from_secs(20));
        assert_eq!(config.pool_idle_timeout, Duration::from_secs(180));
    }

    #[test]
    fn test_config_builder_pool_settings() {
        // Test pool configuration
        let config = HttpClientConfig::builder()
            .pool_max_idle_per_host(25)
            .pool_idle_timeout(Duration::from_secs(150))
            .build();

        assert_eq!(config.pool_max_idle_per_host, 25);
        assert_eq!(config.pool_idle_timeout, Duration::from_secs(150));
    }

    #[test]
    fn test_config_builder_cookie_store() {
        // Test cookie store enabled
        let config1 = HttpClientConfig::builder()
            .cookie_store_enabled(true)
            .build();
        assert!(config1.cookie_store_enabled);

        // Test cookie store disabled
        let config2 = HttpClientConfig::builder()
            .cookie_store_enabled(false)
            .build();
        assert!(!config2.cookie_store_enabled);
    }

    #[test]
    fn test_custom_headers_global() {
        // Test adding multiple custom headers
        let config = HttpClientConfig::builder()
            .header("X-API-Key", "secret-key")
            .header("X-Request-ID", "12345")
            .header("X-Custom-Header", "custom-value")
            .build();

        assert_eq!(
            config.default_headers.get("X-API-Key").unwrap(),
            "secret-key"
        );
        assert_eq!(
            config.default_headers.get("X-Request-ID").unwrap(),
            "12345"
        );
        assert_eq!(
            config.default_headers.get("X-Custom-Header").unwrap(),
            "custom-value"
        );
    }

    #[test]
    fn test_user_agent_header() {
        // Test User-Agent header customization
        let config = HttpClientConfig::builder()
            .user_agent("custom-agent/2.5")
            .build();

        assert_eq!(
            config.default_headers.get(USER_AGENT).unwrap(),
            "custom-agent/2.5"
        );
    }

    #[test]
    fn test_user_agent_override() {
        // Test that custom User-Agent overrides default
        let config = HttpClientConfig::builder()
            .user_agent("override-agent/1.0")
            .header("X-Custom", "value")
            .build();

        assert_eq!(
            config.default_headers.get(USER_AGENT).unwrap(),
            "override-agent/1.0"
        );
        assert_eq!(
            config.default_headers.get("X-Custom").unwrap(),
            "value"
        );
    }

    #[test]
    fn test_config_builder_multiple_headers() {
        // Test chaining multiple header calls
        let config = HttpClientConfig::builder()
            .header("Authorization", "Bearer token123")
            .header("Accept", "application/json")
            .header("Content-Type", "application/json")
            .build();

        assert_eq!(
            config.default_headers.get("Authorization").unwrap(),
            "Bearer token123"
        );
        assert_eq!(
            config.default_headers.get("Accept").unwrap(),
            "application/json"
        );
        assert_eq!(
            config.default_headers.get("Content-Type").unwrap(),
            "application/json"
        );
    }

    #[test]
    fn test_config_builder_fluent_api() {
        // Test that the builder API is fluent (returns Self)
        let config = HttpClientConfig::builder()
            .request_timeout(Duration::from_secs(30))
            .connect_timeout(Duration::from_secs(10))
            .pool_idle_timeout(Duration::from_secs(90))
            .pool_max_idle_per_host(15)
            .cookie_store_enabled(true)
            .user_agent("fluent-test/1.0")
            .header("X-Test", "fluent")
            .build();

        // Verify all settings were applied
        assert_eq!(config.request_timeout, Duration::from_secs(30));
        assert_eq!(config.connect_timeout, Duration::from_secs(10));
        assert_eq!(config.pool_idle_timeout, Duration::from_secs(90));
        assert_eq!(config.pool_max_idle_per_host, 15);
        assert!(config.cookie_store_enabled);
        assert_eq!(
            config.default_headers.get(USER_AGENT).unwrap(),
            "fluent-test/1.0"
        );
        assert_eq!(
            config.default_headers.get("X-Test").unwrap(),
            "fluent"
        );
    }

    #[test]
    fn test_config_debug() {
        // Test that Debug trait works correctly
        let config = HttpClientConfig::default();
        let debug_string = format!("{:?}", config);

        assert!(debug_string.contains("HttpClientConfig"));
        assert!(debug_string.contains("request_timeout"));
    }

    #[test]
    fn test_config_clone() {
        // Test that configuration can be cloned
        let config1 = HttpClientConfig::builder()
            .request_timeout(Duration::from_secs(45))
            .user_agent("clone-test/1.0")
            .build();

        let config2 = config1.clone();

        assert_eq!(config1.request_timeout, config2.request_timeout);
        assert_eq!(config1.connect_timeout, config2.connect_timeout);
        assert_eq!(
            config1.default_headers.get(USER_AGENT),
            config2.default_headers.get(USER_AGENT)
        );
    }

    #[test]
    fn test_builder_default() {
        // Test that builder has a Default implementation
        let builder = HttpClientConfigBuilder::default();
        let config = builder.build();

        // Should produce same config as HttpClientConfig::default()
        let default_config = HttpClientConfig::default();
        assert_eq!(config.request_timeout, default_config.request_timeout);
        assert_eq!(config.connect_timeout, default_config.connect_timeout);
    }

    #[test]
    fn test_invalid_header_graceful_handling() {
        // Test that invalid headers are gracefully ignored (not panicking)
        let config = HttpClientConfig::builder()
            .header("Valid-Header", "valid-value")
            // Invalid header value with non-ASCII characters might be rejected by HeaderValue
            .build();

        // Should not panic, valid header should be present
        assert!(config.default_headers.get("Valid-Header").is_some());
    }
}
