//! Log level configuration for the SDK.
//!
//! Defines the verbosity level for SDK logging.

use uniffi;

/// The log level for SDK logging.
///
/// Controls the verbosity of logs emitted by the SDK. Log levels are hierarchical:
/// - `Trace` includes all log levels
/// - `Debug` includes Debug, Info, Warn, and Error
/// - `Info` includes Info, Warn, and Error
/// - `Warn` includes Warn and Error
/// - `Error` includes only Error
/// - `Off` disables all logging
///
/// # FFI Safety
///
/// This enum is exported via UniFFI and can be used from Kotlin and Swift.
///
/// # Example
///
/// ```rust
/// use nuvio_core::config::LogLevel;
///
/// let level = LogLevel::Info;
/// assert!(level.is_enabled_for(&LogLevel::Warn));
/// assert!(level.is_enabled_for(&LogLevel::Error));
/// assert!(!level.is_enabled_for(&LogLevel::Debug));
/// ```
#[derive(uniffi::Enum, Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Default)]
pub enum LogLevel {
    /// Most verbose logging level. Includes fine-grained diagnostic information.
    /// Use sparingly as it can generate a lot of output.
    Trace,
    
    /// Debug-level logging. Useful during development for debugging.
    Debug,
    
    /// Informational messages. Default logging level for production.
    #[default]
    Info,
    
    /// Warning messages indicating potential issues.
    Warn,
    
    /// Error messages for actual failures.
    Error,
    
    /// Disable all logging.
    Off,
}

impl LogLevel {
    /// Returns the log level as a string suitable for tracing filters.
    ///
    /// # Example
    ///
    /// ```rust
    /// use nuvio_core::config::LogLevel;
    ///
    /// assert_eq!(LogLevel::Info.as_str(), "info");
    /// assert_eq!(LogLevel::Debug.as_str(), "debug");
    /// ```
    pub fn as_str(&self) -> &'static str {
        match self {
            LogLevel::Trace => "trace",
            LogLevel::Debug => "debug",
            LogLevel::Info => "info",
            LogLevel::Warn => "warn",
            LogLevel::Error => "error",
            LogLevel::Off => "off",
        }
    }
    
    /// Checks if this log level would emit logs at the given target level.
    ///
    /// # Example
    ///
    /// ```rust
    /// use nuvio_core::config::LogLevel;
    ///
    /// let level = LogLevel::Info;
    /// assert!(level.is_enabled_for(&LogLevel::Warn));  // Warn is less verbose than Info
    /// assert!(level.is_enabled_for(&LogLevel::Error)); // Error is less verbose than Info
    /// assert!(!level.is_enabled_for(&LogLevel::Debug)); // Debug is more verbose than Info
    /// ```
    pub fn is_enabled_for(&self, target: &LogLevel) -> bool {
        if matches!(self, LogLevel::Off) {
            return false;
        }
        if matches!(target, LogLevel::Off) {
            return false;
        }
        self <= target
    }
    
    /// Attempts to parse a log level from a string.
    /// Returns the default (Info) if the string is not recognized.
    ///
    /// # Example
    ///
    /// ```rust
    /// use nuvio_core::config::LogLevel;
    ///
    /// assert_eq!(LogLevel::parse("debug"), LogLevel::Debug);
    /// assert_eq!(LogLevel::parse("INFO"), LogLevel::Info);
    /// assert_eq!(LogLevel::parse("unknown"), LogLevel::Info);
    /// ```
    pub fn parse(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "trace" | "verbose" => LogLevel::Trace,
            "debug" => LogLevel::Debug,
            "info" | "information" => LogLevel::Info,
            "warn" | "warning" => LogLevel::Warn,
            "error" | "err" => LogLevel::Error,
            "off" | "none" | "disabled" => LogLevel::Off,
            _ => LogLevel::Info,
        }
    }
    
    /// Converts this log level to a tracing::Level.
    /// Returns None if the log level is Off.
    pub fn to_tracing_level(&self) -> Option<tracing::Level> {
        match self {
            LogLevel::Trace => Some(tracing::Level::TRACE),
            LogLevel::Debug => Some(tracing::Level::DEBUG),
            LogLevel::Info => Some(tracing::Level::INFO),
            LogLevel::Warn => Some(tracing::Level::WARN),
            LogLevel::Error => Some(tracing::Level::ERROR),
            LogLevel::Off => None,
        }
    }
}

impl std::fmt::Display for LogLevel {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_log_level_as_str() {
        assert_eq!(LogLevel::Trace.as_str(), "trace");
        assert_eq!(LogLevel::Debug.as_str(), "debug");
        assert_eq!(LogLevel::Info.as_str(), "info");
        assert_eq!(LogLevel::Warn.as_str(), "warn");
        assert_eq!(LogLevel::Error.as_str(), "error");
        assert_eq!(LogLevel::Off.as_str(), "off");
    }

    #[test]
    fn test_log_level_default() {
        assert_eq!(LogLevel::default(), LogLevel::Info);
    }

    #[test]
    fn test_log_level_display() {
        assert_eq!(format!("{}", LogLevel::Debug), "debug");
        assert_eq!(format!("{}", LogLevel::Info), "info");
    }

    #[test]
    fn test_log_level_parse() {
        // Standard names
        assert_eq!(LogLevel::parse("trace"), LogLevel::Trace);
        assert_eq!(LogLevel::parse("debug"), LogLevel::Debug);
        assert_eq!(LogLevel::parse("info"), LogLevel::Info);
        assert_eq!(LogLevel::parse("warn"), LogLevel::Warn);
        assert_eq!(LogLevel::parse("error"), LogLevel::Error);
        assert_eq!(LogLevel::parse("off"), LogLevel::Off);

        // Case insensitivity
        assert_eq!(LogLevel::parse("DEBUG"), LogLevel::Debug);
        assert_eq!(LogLevel::parse("INFO"), LogLevel::Info);

        // Aliases
        assert_eq!(LogLevel::parse("verbose"), LogLevel::Trace);
        assert_eq!(LogLevel::parse("information"), LogLevel::Info);
        assert_eq!(LogLevel::parse("warning"), LogLevel::Warn);
        assert_eq!(LogLevel::parse("err"), LogLevel::Error);
        assert_eq!(LogLevel::parse("none"), LogLevel::Off);
        assert_eq!(LogLevel::parse("disabled"), LogLevel::Off);

        // Unknown defaults to Info
        assert_eq!(LogLevel::parse("unknown"), LogLevel::Info);
        assert_eq!(LogLevel::parse(""), LogLevel::Info);
    }

    #[test]
    fn test_log_level_is_enabled_for() {
        // Trace enables all levels
        assert!(LogLevel::Trace.is_enabled_for(&LogLevel::Trace));
        assert!(LogLevel::Trace.is_enabled_for(&LogLevel::Debug));
        assert!(LogLevel::Trace.is_enabled_for(&LogLevel::Info));
        assert!(LogLevel::Trace.is_enabled_for(&LogLevel::Warn));
        assert!(LogLevel::Trace.is_enabled_for(&LogLevel::Error));

        // Info enables Info, Warn, Error
        assert!(!LogLevel::Info.is_enabled_for(&LogLevel::Trace));
        assert!(!LogLevel::Info.is_enabled_for(&LogLevel::Debug));
        assert!(LogLevel::Info.is_enabled_for(&LogLevel::Info));
        assert!(LogLevel::Info.is_enabled_for(&LogLevel::Warn));
        assert!(LogLevel::Info.is_enabled_for(&LogLevel::Error));

        // Error only enables Error
        assert!(!LogLevel::Error.is_enabled_for(&LogLevel::Trace));
        assert!(!LogLevel::Error.is_enabled_for(&LogLevel::Debug));
        assert!(!LogLevel::Error.is_enabled_for(&LogLevel::Info));
        assert!(!LogLevel::Error.is_enabled_for(&LogLevel::Warn));
        assert!(LogLevel::Error.is_enabled_for(&LogLevel::Error));

        // Off disables everything
        assert!(!LogLevel::Off.is_enabled_for(&LogLevel::Trace));
        assert!(!LogLevel::Off.is_enabled_for(&LogLevel::Error));
        assert!(!LogLevel::Off.is_enabled_for(&LogLevel::Off));
    }

    #[test]
    fn test_log_level_ordering() {
        assert!(LogLevel::Trace < LogLevel::Debug);
        assert!(LogLevel::Debug < LogLevel::Info);
        assert!(LogLevel::Info < LogLevel::Warn);
        assert!(LogLevel::Warn < LogLevel::Error);
        assert!(LogLevel::Error < LogLevel::Off);
    }

    #[test]
    fn test_log_level_to_tracing_level() {
        assert_eq!(LogLevel::Trace.to_tracing_level(), Some(tracing::Level::TRACE));
        assert_eq!(LogLevel::Debug.to_tracing_level(), Some(tracing::Level::DEBUG));
        assert_eq!(LogLevel::Info.to_tracing_level(), Some(tracing::Level::INFO));
        assert_eq!(LogLevel::Warn.to_tracing_level(), Some(tracing::Level::WARN));
        assert_eq!(LogLevel::Error.to_tracing_level(), Some(tracing::Level::ERROR));
        assert_eq!(LogLevel::Off.to_tracing_level(), None);
    }

    #[test]
    fn test_log_level_clone() {
        let level = LogLevel::Debug;
        let cloned = level.clone();
        assert_eq!(level, cloned);
    }

    #[test]
    fn test_log_level_copy() {
        let level = LogLevel::Info;
        let copied = level;
        assert_eq!(level, copied);
    }
}
