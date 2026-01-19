//! SDK Configuration struct and builder.
//!
//! Provides the main configuration type for initializing the Nuvio SDK.

use uniffi;
use super::{Environment, LogLevel};

/// SDK Configuration.
///
/// This struct holds all configuration parameters for the Nuvio SDK including
/// environment settings, logging configuration, and application metadata.
///
/// Use [`SdkConfigBuilder`] to construct instances of this struct.
///
/// # FFI Safety
///
/// This struct is exported via UniFFI and can be used from Kotlin and Swift.
///
/// # Example
///
/// ```rust
/// use nuvio_core::config::{SdkConfig, Environment, LogLevel};
///
/// // Default configuration
/// let config = SdkConfig::default();
///
/// // Custom configuration
/// let config = SdkConfig::builder()
///     .environment(Environment::Development)
///     .log_level(LogLevel::Debug)
///     .app_name("MyApp")
///     .app_version("1.0.0")
///     .build();
/// ```
#[derive(uniffi::Record, Debug, Clone, PartialEq)]
pub struct SdkConfig {
    /// The runtime environment (Development, Staging, Production).
    pub environment: Environment,
    
    /// The log level for SDK logging.
    pub log_level: LogLevel,
    
    /// Application name for logging and identification.
    pub app_name: String,
    
    /// Application version for logging and identification.
    pub app_version: String,
    
    /// User agent string to use for HTTP requests.
    pub user_agent: String,
    
    /// Whether to enable debug assertions and additional validation.
    pub debug_mode: bool,
    
    /// Optional custom data directory path for SDK storage.
    /// If not set, the SDK will use platform-specific defaults.
    pub data_directory: Option<String>,
    
    /// Whether to collect anonymous usage analytics.
    pub analytics_enabled: bool,
}

impl Default for SdkConfig {
    /// Creates a new configuration with production-ready defaults.
    ///
    /// # Default Values
    ///
    /// - Environment: Production
    /// - Log level: Info
    /// - App name: "nuvio-sdk"
    /// - App version: Current crate version
    /// - User agent: "nuvio-sdk/{version}"
    /// - Debug mode: false
    /// - Data directory: None (use platform default)
    /// - Analytics enabled: true
    fn default() -> Self {
        Self {
            environment: Environment::Production,
            log_level: LogLevel::Info,
            app_name: "nuvio-sdk".to_string(),
            app_version: env!("CARGO_PKG_VERSION").to_string(),
            user_agent: format!("nuvio-sdk/{}", env!("CARGO_PKG_VERSION")),
            debug_mode: false,
            data_directory: None,
            analytics_enabled: true,
        }
    }
}

impl SdkConfig {
    /// Creates a new builder for constructing SDK configuration.
    ///
    /// # Example
    ///
    /// ```rust
    /// use nuvio_core::config::{SdkConfig, Environment};
    ///
    /// let config = SdkConfig::builder()
    ///     .environment(Environment::Development)
    ///     .build();
    /// ```
    pub fn builder() -> SdkConfigBuilder {
        SdkConfigBuilder::default()
    }
    
    /// Creates configuration from environment variables.
    ///
    /// This method reads the following environment variables:
    /// - `NUVIO_ENV` or `NUVIO_ENVIRONMENT`: Sets the environment (dev, staging, prod)
    /// - `NUVIO_LOG_LEVEL`: Sets the log level (trace, debug, info, warn, error)
    /// - `NUVIO_APP_NAME`: Sets the application name
    /// - `NUVIO_APP_VERSION`: Sets the application version
    /// - `NUVIO_DATA_DIR`: Sets the data directory
    /// - `NUVIO_DEBUG`: Enables debug mode if set to "true" or "1"
    /// - `NUVIO_ANALYTICS`: Enables/disables analytics if set
    ///
    /// # Example
    ///
    /// ```rust
    /// use nuvio_core::config::SdkConfig;
    ///
    /// // Read configuration from environment
    /// let config = SdkConfig::from_env();
    /// ```
    pub fn from_env() -> Self {
        let mut builder = SdkConfigBuilder::default();
        
        // Environment
        if let Ok(env_str) = std::env::var("NUVIO_ENV")
            .or_else(|_| std::env::var("NUVIO_ENVIRONMENT"))
        {
            builder = builder.environment(Environment::from_str(&env_str));
        }
        
        // Log level
        if let Ok(level_str) = std::env::var("NUVIO_LOG_LEVEL") {
            builder = builder.log_level(LogLevel::from_str(&level_str));
        }
        
        // App name
        if let Ok(name) = std::env::var("NUVIO_APP_NAME") {
            builder = builder.app_name(&name);
        }
        
        // App version
        if let Ok(version) = std::env::var("NUVIO_APP_VERSION") {
            builder = builder.app_version(&version);
        }
        
        // Data directory
        if let Ok(dir) = std::env::var("NUVIO_DATA_DIR") {
            builder = builder.data_directory(&dir);
        }
        
        // Debug mode
        if let Ok(debug) = std::env::var("NUVIO_DEBUG") {
            let enabled = debug == "true" || debug == "1" || debug == "yes";
            builder = builder.debug_mode(enabled);
        }
        
        // Analytics
        if let Ok(analytics) = std::env::var("NUVIO_ANALYTICS") {
            let enabled = analytics != "false" && analytics != "0" && analytics != "no";
            builder = builder.analytics_enabled(enabled);
        }
        
        builder.build()
    }
    
    /// Returns the effective log level, taking environment into account.
    ///
    /// In development mode, this may return a more verbose level than configured.
    pub fn effective_log_level(&self) -> LogLevel {
        if self.debug_mode && self.log_level > LogLevel::Debug {
            LogLevel::Debug
        } else {
            self.log_level
        }
    }
}

/// Builder for SDK configuration.
///
/// This builder provides a fluent API for constructing [`SdkConfig`] instances
/// with custom settings. All settings are optional and fall back to sensible defaults.
///
/// # Example
///
/// ```rust
/// use nuvio_core::config::{SdkConfig, Environment, LogLevel};
///
/// let config = SdkConfig::builder()
///     .environment(Environment::Development)
///     .log_level(LogLevel::Debug)
///     .app_name("MyApp")
///     .app_version("1.0.0")
///     .debug_mode(true)
///     .build();
/// ```
#[derive(Default)]
pub struct SdkConfigBuilder {
    environment: Option<Environment>,
    log_level: Option<LogLevel>,
    app_name: Option<String>,
    app_version: Option<String>,
    user_agent: Option<String>,
    debug_mode: Option<bool>,
    data_directory: Option<String>,
    analytics_enabled: Option<bool>,
}

impl SdkConfigBuilder {
    /// Sets the runtime environment.
    ///
    /// # Arguments
    ///
    /// * `environment` - The runtime environment (Development, Staging, Production)
    ///
    /// # Example
    ///
    /// ```rust
    /// use nuvio_core::config::{SdkConfig, Environment};
    ///
    /// let config = SdkConfig::builder()
    ///     .environment(Environment::Development)
    ///     .build();
    /// ```
    pub fn environment(mut self, environment: Environment) -> Self {
        self.environment = Some(environment);
        self
    }
    
    /// Sets the log level for SDK logging.
    ///
    /// # Arguments
    ///
    /// * `level` - The log level (Trace, Debug, Info, Warn, Error, Off)
    ///
    /// # Example
    ///
    /// ```rust
    /// use nuvio_core::config::{SdkConfig, LogLevel};
    ///
    /// let config = SdkConfig::builder()
    ///     .log_level(LogLevel::Debug)
    ///     .build();
    /// ```
    pub fn log_level(mut self, level: LogLevel) -> Self {
        self.log_level = Some(level);
        self
    }
    
    /// Sets the application name for logging and identification.
    ///
    /// # Arguments
    ///
    /// * `name` - The application name
    ///
    /// # Example
    ///
    /// ```rust
    /// use nuvio_core::config::SdkConfig;
    ///
    /// let config = SdkConfig::builder()
    ///     .app_name("MyStreamingApp")
    ///     .build();
    /// ```
    pub fn app_name(mut self, name: &str) -> Self {
        self.app_name = Some(name.to_string());
        self
    }
    
    /// Sets the application version for logging and identification.
    ///
    /// # Arguments
    ///
    /// * `version` - The application version string
    ///
    /// # Example
    ///
    /// ```rust
    /// use nuvio_core::config::SdkConfig;
    ///
    /// let config = SdkConfig::builder()
    ///     .app_version("2.1.0")
    ///     .build();
    /// ```
    pub fn app_version(mut self, version: &str) -> Self {
        self.app_version = Some(version.to_string());
        self
    }
    
    /// Sets a custom user agent string for HTTP requests.
    ///
    /// # Arguments
    ///
    /// * `user_agent` - The user agent string
    ///
    /// # Example
    ///
    /// ```rust
    /// use nuvio_core::config::SdkConfig;
    ///
    /// let config = SdkConfig::builder()
    ///     .user_agent("MyApp/1.0 (iOS 17.0)")
    ///     .build();
    /// ```
    pub fn user_agent(mut self, user_agent: &str) -> Self {
        self.user_agent = Some(user_agent.to_string());
        self
    }
    
    /// Enables or disables debug mode.
    ///
    /// When debug mode is enabled, additional validation and verbose logging
    /// may be activated regardless of the log level setting.
    ///
    /// # Arguments
    ///
    /// * `enabled` - Whether to enable debug mode
    ///
    /// # Example
    ///
    /// ```rust
    /// use nuvio_core::config::SdkConfig;
    ///
    /// let config = SdkConfig::builder()
    ///     .debug_mode(true)
    ///     .build();
    /// ```
    pub fn debug_mode(mut self, enabled: bool) -> Self {
        self.debug_mode = Some(enabled);
        self
    }
    
    /// Sets a custom data directory for SDK storage.
    ///
    /// # Arguments
    ///
    /// * `path` - The path to the data directory
    ///
    /// # Example
    ///
    /// ```rust
    /// use nuvio_core::config::SdkConfig;
    ///
    /// let config = SdkConfig::builder()
    ///     .data_directory("/path/to/data")
    ///     .build();
    /// ```
    pub fn data_directory(mut self, path: &str) -> Self {
        self.data_directory = Some(path.to_string());
        self
    }
    
    /// Enables or disables anonymous analytics collection.
    ///
    /// # Arguments
    ///
    /// * `enabled` - Whether to enable analytics
    ///
    /// # Example
    ///
    /// ```rust
    /// use nuvio_core::config::SdkConfig;
    ///
    /// let config = SdkConfig::builder()
    ///     .analytics_enabled(false)
    ///     .build();
    /// ```
    pub fn analytics_enabled(mut self, enabled: bool) -> Self {
        self.analytics_enabled = Some(enabled);
        self
    }
    
    /// Builds the SDK configuration.
    ///
    /// Any settings not explicitly set will use their default values.
    ///
    /// # Example
    ///
    /// ```rust
    /// use nuvio_core::config::{SdkConfig, Environment};
    ///
    /// let config = SdkConfig::builder()
    ///     .environment(Environment::Development)
    ///     .build();
    /// ```
    pub fn build(self) -> SdkConfig {
        let defaults = SdkConfig::default();
        
        let app_name = self.app_name.unwrap_or(defaults.app_name);
        let app_version = self.app_version.unwrap_or(defaults.app_version);
        let user_agent = self.user_agent.unwrap_or_else(|| {
            format!("{}/{}", app_name, app_version)
        });
        
        let environment = self.environment.unwrap_or(defaults.environment);
        let debug_mode = self.debug_mode.unwrap_or_else(|| {
            // Enable debug mode by default in development
            environment.is_development()
        });
        
        SdkConfig {
            environment,
            log_level: self.log_level.unwrap_or(defaults.log_level),
            app_name,
            app_version,
            user_agent,
            debug_mode,
            data_directory: self.data_directory.or(defaults.data_directory),
            analytics_enabled: self.analytics_enabled.unwrap_or(defaults.analytics_enabled),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sdk_config_default() {
        let config = SdkConfig::default();
        
        assert_eq!(config.environment, Environment::Production);
        assert_eq!(config.log_level, LogLevel::Info);
        assert_eq!(config.app_name, "nuvio-sdk");
        assert!(!config.debug_mode);
        assert!(config.data_directory.is_none());
        assert!(config.analytics_enabled);
    }

    #[test]
    fn test_sdk_config_builder() {
        let config = SdkConfig::builder()
            .environment(Environment::Development)
            .log_level(LogLevel::Debug)
            .app_name("TestApp")
            .app_version("2.0.0")
            .user_agent("TestApp/2.0.0")
            .debug_mode(true)
            .data_directory("/tmp/nuvio")
            .analytics_enabled(false)
            .build();
        
        assert_eq!(config.environment, Environment::Development);
        assert_eq!(config.log_level, LogLevel::Debug);
        assert_eq!(config.app_name, "TestApp");
        assert_eq!(config.app_version, "2.0.0");
        assert_eq!(config.user_agent, "TestApp/2.0.0");
        assert!(config.debug_mode);
        assert_eq!(config.data_directory, Some("/tmp/nuvio".to_string()));
        assert!(!config.analytics_enabled);
    }

    #[test]
    fn test_sdk_config_builder_partial() {
        // Test that unset values fall back to defaults
        let config = SdkConfig::builder()
            .environment(Environment::Staging)
            .build();
        
        assert_eq!(config.environment, Environment::Staging);
        assert_eq!(config.log_level, LogLevel::Info); // Default
        assert_eq!(config.app_name, "nuvio-sdk"); // Default
    }

    #[test]
    fn test_sdk_config_builder_auto_user_agent() {
        let config = SdkConfig::builder()
            .app_name("MyApp")
            .app_version("1.5.0")
            .build();
        
        // User agent should be auto-generated from app_name and app_version
        assert_eq!(config.user_agent, "MyApp/1.5.0");
    }

    #[test]
    fn test_sdk_config_builder_development_debug() {
        // Development environment should auto-enable debug mode
        let config = SdkConfig::builder()
            .environment(Environment::Development)
            .build();
        
        assert!(config.debug_mode);
        
        // But explicit setting should override
        let config = SdkConfig::builder()
            .environment(Environment::Development)
            .debug_mode(false)
            .build();
        
        assert!(!config.debug_mode);
    }

    #[test]
    fn test_sdk_config_effective_log_level() {
        // Normal case - returns configured level
        let config = SdkConfig::builder()
            .log_level(LogLevel::Info)
            .build();
        assert_eq!(config.effective_log_level(), LogLevel::Info);
        
        // Debug mode with Info level - should return Debug
        let config = SdkConfig::builder()
            .log_level(LogLevel::Info)
            .debug_mode(true)
            .build();
        assert_eq!(config.effective_log_level(), LogLevel::Debug);
        
        // Debug mode with Trace level - should return Trace (more verbose)
        let config = SdkConfig::builder()
            .log_level(LogLevel::Trace)
            .debug_mode(true)
            .build();
        assert_eq!(config.effective_log_level(), LogLevel::Trace);
    }

    #[test]
    fn test_sdk_config_clone() {
        let config1 = SdkConfig::builder()
            .app_name("CloneTest")
            .build();
        
        let config2 = config1.clone();
        
        assert_eq!(config1, config2);
        assert_eq!(config1.app_name, config2.app_name);
    }

    #[test]
    fn test_sdk_config_debug() {
        let config = SdkConfig::default();
        let debug_str = format!("{:?}", config);
        
        assert!(debug_str.contains("SdkConfig"));
        assert!(debug_str.contains("nuvio-sdk"));
    }

    #[test]
    fn test_builder_default() {
        // Builder with no modifications should produce same as SdkConfig::default()
        let builder_config = SdkConfig::builder().build();
        let default_config = SdkConfig::default();
        
        // Note: debug_mode differs because builder auto-enables for dev
        // but default explicitly sets to false
        assert_eq!(builder_config.environment, default_config.environment);
        assert_eq!(builder_config.log_level, default_config.log_level);
        assert_eq!(builder_config.app_name, default_config.app_name);
    }
}
