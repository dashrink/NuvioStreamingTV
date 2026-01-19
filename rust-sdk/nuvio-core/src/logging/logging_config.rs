//! Logging configuration and initialization.
//!
//! Provides logging configuration and initialization functions that can be
//! called from Rust code or via FFI from Kotlin/Swift.

use crate::config::LogLevel;
use parking_lot::Once;
use tracing_subscriber::{fmt, EnvFilter};
use uniffi;

/// Global initialization guard to ensure logging is only initialized once.
static LOGGING_INIT: Once = Once::new();

/// Configuration for the logging subsystem.
///
/// This struct controls how the SDK outputs log messages including
/// format, verbosity, and what metadata to include.
///
/// # FFI Safety
///
/// This struct is exported via UniFFI and can be used from Kotlin and Swift.
///
/// # Example
///
/// ```rust
/// use nuvio_core::logging::LoggingConfig;
/// use nuvio_core::config::LogLevel;
///
/// let config = LoggingConfig::builder()
///     .level(LogLevel::Debug)
///     .show_target(true)
///     .show_file(true)
///     .build();
/// ```
#[derive(uniffi::Record, Debug, Clone, PartialEq)]
pub struct LoggingConfig {
    /// The minimum log level to output.
    pub level: LogLevel,
    
    /// Whether to include the log target (module path) in output.
    pub show_target: bool,
    
    /// Whether to include the source file name in output.
    pub show_file: bool,
    
    /// Whether to include the line number in output.
    pub show_line: bool,
    
    /// Whether to include timestamps in output.
    pub show_timestamp: bool,
    
    /// Whether to use ANSI color codes in output.
    pub use_ansi: bool,
    
    /// Optional custom filter string (overrides level if set).
    /// Uses the tracing EnvFilter syntax (e.g., "nuvio_core=debug,info").
    pub filter: Option<String>,
}

impl Default for LoggingConfig {
    /// Creates a default logging configuration suitable for production.
    ///
    /// # Default Values
    ///
    /// - Level: Info
    /// - Show target: false
    /// - Show file: false
    /// - Show line: false
    /// - Show timestamp: true
    /// - Use ANSI: auto-detect
    fn default() -> Self {
        Self {
            level: LogLevel::Info,
            show_target: false,
            show_file: false,
            show_line: false,
            show_timestamp: true,
            use_ansi: true,
        filter: None,
        }
    }
}

impl LoggingConfig {
    /// Creates a new builder for logging configuration.
    ///
    /// # Example
    ///
    /// ```rust
    /// use nuvio_core::logging::LoggingConfig;
    /// use nuvio_core::config::LogLevel;
    ///
    /// let config = LoggingConfig::builder()
    ///     .level(LogLevel::Debug)
    ///     .build();
    /// ```
    pub fn builder() -> LoggingConfigBuilder {
        LoggingConfigBuilder::default()
    }
    
    /// Creates a debug-friendly logging configuration.
    ///
    /// This configuration is optimized for development with:
    /// - Debug level logging
    /// - Target, file, and line information shown
    /// - ANSI colors enabled
    ///
    /// # Example
    ///
    /// ```rust
    /// use nuvio_core::logging::LoggingConfig;
    ///
    /// let config = LoggingConfig::debug();
    /// ```
    pub fn debug() -> Self {
        Self {
            level: LogLevel::Debug,
            show_target: true,
            show_file: true,
            show_line: true,
            show_timestamp: true,
            use_ansi: true,
            filter: None,
        }
    }
    
    /// Creates a minimal logging configuration for production.
    ///
    /// This configuration is optimized for production with:
    /// - Info level logging
    /// - Minimal metadata
    /// - No ANSI colors
    ///
    /// # Example
    ///
    /// ```rust
    /// use nuvio_core::logging::LoggingConfig;
    ///
    /// let config = LoggingConfig::production();
    /// ```
    pub fn production() -> Self {
        Self {
            level: LogLevel::Info,
            show_target: false,
            show_file: false,
            show_line: false,
            show_timestamp: true,
            use_ansi: false,
            filter: None,
        }
    }
    
    /// Builds the EnvFilter for this configuration.
    fn build_filter(&self) -> EnvFilter {
        if let Some(ref filter_str) = self.filter {
            EnvFilter::try_new(filter_str)
                .unwrap_or_else(|_| EnvFilter::new(self.level.as_str()))
        } else {
            EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| EnvFilter::new(self.level.as_str()))
        }
    }
}

/// Builder for logging configuration.
///
/// This builder provides a fluent API for constructing [`LoggingConfig`] instances.
///
/// # Example
///
/// ```rust
/// use nuvio_core::logging::LoggingConfig;
/// use nuvio_core::config::LogLevel;
///
/// let config = LoggingConfig::builder()
///     .level(LogLevel::Debug)
///     .show_target(true)
///     .show_file(true)
///     .show_line(true)
///     .show_timestamp(true)
///     .use_ansi(true)
///     .build();
/// ```
#[derive(Default)]
pub struct LoggingConfigBuilder {
    level: Option<LogLevel>,
    show_target: Option<bool>,
    show_file: Option<bool>,
    show_line: Option<bool>,
    show_timestamp: Option<bool>,
    use_ansi: Option<bool>,
    filter: Option<String>,
}

impl LoggingConfigBuilder {
    /// Sets the minimum log level.
    pub fn level(mut self, level: LogLevel) -> Self {
        self.level = Some(level);
        self
    }
    
    /// Sets whether to show the log target (module path).
    pub fn show_target(mut self, show: bool) -> Self {
        self.show_target = Some(show);
        self
    }
    
    /// Sets whether to show the source file name.
    pub fn show_file(mut self, show: bool) -> Self {
        self.show_file = Some(show);
        self
    }
    
    /// Sets whether to show the line number.
    pub fn show_line(mut self, show: bool) -> Self {
        self.show_line = Some(show);
        self
    }
    
    /// Sets whether to show timestamps.
    pub fn show_timestamp(mut self, show: bool) -> Self {
        self.show_timestamp = Some(show);
        self
    }
    
    /// Sets whether to use ANSI color codes.
    pub fn use_ansi(mut self, use_ansi: bool) -> Self {
        self.use_ansi = Some(use_ansi);
        self
    }
    
    /// Sets a custom filter string.
    ///
    /// This overrides the level setting and allows fine-grained control
    /// using the tracing EnvFilter syntax.
    ///
    /// # Example
    ///
    /// ```rust
    /// use nuvio_core::logging::LoggingConfig;
    ///
    /// let config = LoggingConfig::builder()
    ///     .filter("nuvio_core=debug,hyper=warn,info")
    ///     .build();
    /// ```
    pub fn filter(mut self, filter: &str) -> Self {
        self.filter = Some(filter.to_string());
        self
    }
    
    /// Builds the logging configuration.
    pub fn build(self) -> LoggingConfig {
        let defaults = LoggingConfig::default();
        
        LoggingConfig {
            level: self.level.unwrap_or(defaults.level),
            show_target: self.show_target.unwrap_or(defaults.show_target),
            show_file: self.show_file.unwrap_or(defaults.show_file),
            show_line: self.show_line.unwrap_or(defaults.show_line),
            show_timestamp: self.show_timestamp.unwrap_or(defaults.show_timestamp),
            use_ansi: self.use_ansi.unwrap_or(defaults.use_ansi),
            filter: self.filter.or(defaults.filter),
        }
    }
}

/// Initializes the logging subsystem with optional configuration.
///
/// This function should be called once at application startup. If called
/// multiple times, subsequent calls are ignored.
///
/// # Arguments
///
/// * `config` - Optional logging configuration. If None, uses defaults.
///
/// # Example
///
/// ```rust
/// use nuvio_core::logging::{init_logging, LoggingConfig};
/// use nuvio_core::config::LogLevel;
///
/// // Initialize with defaults
/// init_logging(None);
///
/// // Or with custom config
/// let config = LoggingConfig::builder()
///     .level(LogLevel::Debug)
///     .build();
/// init_logging(Some(config));
/// ```
///
/// # FFI Note
///
/// This function is exported via UniFFI and can be called from Kotlin and Swift.
#[uniffi::export]
pub fn init_logging(config: Option<LoggingConfig>) {
    let config = config.unwrap_or_default();
    init_logging_with_config(config);
}

/// Initializes the logging subsystem with the given configuration.
///
/// This is the internal implementation that performs the actual initialization.
/// Use [`init_logging`] for the FFI-safe version.
///
/// # Arguments
///
/// * `config` - The logging configuration to use.
pub fn init_logging_with_config(config: LoggingConfig) {
    LOGGING_INIT.call_once(|| {
        let filter = config.build_filter();
        
        let subscriber = fmt()
            .with_env_filter(filter)
            .with_target(config.show_target)
            .with_file(config.show_file)
            .with_line_number(config.show_line)
            .with_ansi(config.use_ansi);
        
        if config.show_timestamp {
            let _ = subscriber.try_init();
        } else {
            let _ = subscriber.without_time().try_init();
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_logging_config_default() {
        let config = LoggingConfig::default();
        
        assert_eq!(config.level, LogLevel::Info);
        assert!(!config.show_target);
        assert!(!config.show_file);
        assert!(!config.show_line);
        assert!(config.show_timestamp);
        assert!(config.use_ansi);
        assert!(config.filter.is_none());
    }

    #[test]
    fn test_logging_config_debug() {
        let config = LoggingConfig::debug();
        
        assert_eq!(config.level, LogLevel::Debug);
        assert!(config.show_target);
        assert!(config.show_file);
        assert!(config.show_line);
        assert!(config.show_timestamp);
        assert!(config.use_ansi);
    }

    #[test]
    fn test_logging_config_production() {
        let config = LoggingConfig::production();
        
        assert_eq!(config.level, LogLevel::Info);
        assert!(!config.show_target);
        assert!(!config.show_file);
        assert!(!config.show_line);
        assert!(config.show_timestamp);
        assert!(!config.use_ansi);
    }

    #[test]
    fn test_logging_config_builder() {
        let config = LoggingConfig::builder()
            .level(LogLevel::Trace)
            .show_target(true)
            .show_file(true)
            .show_line(true)
            .show_timestamp(false)
            .use_ansi(false)
            .filter("test=debug")
            .build();
        
        assert_eq!(config.level, LogLevel::Trace);
        assert!(config.show_target);
        assert!(config.show_file);
        assert!(config.show_line);
        assert!(!config.show_timestamp);
        assert!(!config.use_ansi);
        assert_eq!(config.filter, Some("test=debug".to_string()));
    }

    #[test]
    fn test_logging_config_builder_partial() {
        let config = LoggingConfig::builder()
            .level(LogLevel::Warn)
            .build();
        
        assert_eq!(config.level, LogLevel::Warn);
        // Other values should be defaults
        assert!(!config.show_target);
        assert!(config.show_timestamp);
    }

    #[test]
    fn test_logging_config_clone() {
        let config1 = LoggingConfig::debug();
        let config2 = config1.clone();
        
        assert_eq!(config1, config2);
    }

    #[test]
    fn test_logging_config_debug_trait() {
        let config = LoggingConfig::default();
        let debug_str = format!("{:?}", config);
        
        assert!(debug_str.contains("LoggingConfig"));
        assert!(debug_str.contains("Info"));
    }

    #[test]
    fn test_init_logging_idempotent() {
        // This test verifies that init_logging can be called multiple times
        // without panicking. Note: in tests, the subscriber may already be initialized.
        init_logging(None);
        init_logging(Some(LoggingConfig::debug()));
        // No panic means success
    }
}
