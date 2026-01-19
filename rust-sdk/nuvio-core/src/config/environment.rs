//! Environment type for the SDK.
//!
//! Defines the runtime environment which affects logging, debugging,
//! and other SDK behaviors.

use uniffi;

/// The runtime environment for the SDK.
///
/// This affects various SDK behaviors including:
/// - Logging verbosity and format
/// - Debug features enablement
/// - API endpoint selection (if applicable)
/// - Error detail level in responses
///
/// # FFI Safety
///
/// This enum is exported via UniFFI and can be used from Kotlin and Swift.
#[derive(uniffi::Enum, Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum Environment {
    /// Development environment with verbose logging and debug features.
    /// Use this during local development.
    Development,
    
    /// Staging environment for testing before production.
    /// Similar to production but with additional logging.
    Staging,
    
    /// Production environment with optimized logging and error handling.
    /// This is the default environment.
    #[default]
    Production,
}

impl Environment {
    /// Returns the environment name as a string.
    ///
    /// # Example
    ///
    /// ```rust
    /// use nuvio_core::config::Environment;
    ///
    /// assert_eq!(Environment::Production.as_str(), "production");
    /// assert_eq!(Environment::Development.as_str(), "development");
    /// assert_eq!(Environment::Staging.as_str(), "staging");
    /// ```
    pub fn as_str(&self) -> &'static str {
        match self {
            Environment::Development => "development",
            Environment::Staging => "staging",
            Environment::Production => "production",
        }
    }
    
    /// Returns true if this is a development environment.
    pub fn is_development(&self) -> bool {
        matches!(self, Environment::Development)
    }
    
    /// Returns true if this is a production environment.
    pub fn is_production(&self) -> bool {
        matches!(self, Environment::Production)
    }
    
    /// Returns true if debug features should be enabled.
    /// Debug features are enabled in Development and Staging environments.
    pub fn debug_enabled(&self) -> bool {
        matches!(self, Environment::Development | Environment::Staging)
    }
    
    /// Attempts to parse an environment from a string.
    /// Returns the default (Production) if the string is not recognized.
    ///
    /// # Example
    ///
    /// ```rust
    /// use nuvio_core::config::Environment;
    ///
    /// assert_eq!(Environment::from_str("development"), Environment::Development);
    /// assert_eq!(Environment::from_str("dev"), Environment::Development);
    /// assert_eq!(Environment::from_str("prod"), Environment::Production);
    /// assert_eq!(Environment::from_str("unknown"), Environment::Production);
    /// ```
    pub fn from_str(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "development" | "dev" | "local" => Environment::Development,
            "staging" | "stage" | "test" => Environment::Staging,
            "production" | "prod" | "live" => Environment::Production,
            _ => Environment::Production,
        }
    }
}

impl std::fmt::Display for Environment {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_environment_as_str() {
        assert_eq!(Environment::Development.as_str(), "development");
        assert_eq!(Environment::Staging.as_str(), "staging");
        assert_eq!(Environment::Production.as_str(), "production");
    }

    #[test]
    fn test_environment_default() {
        assert_eq!(Environment::default(), Environment::Production);
    }

    #[test]
    fn test_environment_display() {
        assert_eq!(format!("{}", Environment::Development), "development");
        assert_eq!(format!("{}", Environment::Staging), "staging");
        assert_eq!(format!("{}", Environment::Production), "production");
    }

    #[test]
    fn test_environment_from_str() {
        // Development variants
        assert_eq!(Environment::from_str("development"), Environment::Development);
        assert_eq!(Environment::from_str("dev"), Environment::Development);
        assert_eq!(Environment::from_str("local"), Environment::Development);
        assert_eq!(Environment::from_str("DEV"), Environment::Development);
        
        // Staging variants
        assert_eq!(Environment::from_str("staging"), Environment::Staging);
        assert_eq!(Environment::from_str("stage"), Environment::Staging);
        assert_eq!(Environment::from_str("test"), Environment::Staging);
        
        // Production variants
        assert_eq!(Environment::from_str("production"), Environment::Production);
        assert_eq!(Environment::from_str("prod"), Environment::Production);
        assert_eq!(Environment::from_str("live"), Environment::Production);
        
        // Unknown defaults to Production
        assert_eq!(Environment::from_str("unknown"), Environment::Production);
        assert_eq!(Environment::from_str(""), Environment::Production);
    }

    #[test]
    fn test_environment_checks() {
        assert!(Environment::Development.is_development());
        assert!(!Environment::Development.is_production());
        assert!(Environment::Development.debug_enabled());

        assert!(!Environment::Staging.is_development());
        assert!(!Environment::Staging.is_production());
        assert!(Environment::Staging.debug_enabled());

        assert!(!Environment::Production.is_development());
        assert!(Environment::Production.is_production());
        assert!(!Environment::Production.debug_enabled());
    }

    #[test]
    fn test_environment_clone() {
        let env = Environment::Development;
        let cloned = env.clone();
        assert_eq!(env, cloned);
    }

    #[test]
    fn test_environment_copy() {
        let env = Environment::Staging;
        let copied = env;
        assert_eq!(env, copied);
    }
}
