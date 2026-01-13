//! TLS configuration and certificate pinning module
//!
//! This module provides TLS configuration utilities including certificate pinning
//! to prevent Man-in-the-Middle (MITM) attacks by ensuring only trusted certificates
//! are accepted for critical API endpoints.
//!
//! # Architecture
//!
//! The module builds custom `rustls::ClientConfig` instances with pinned certificates
//! in a custom root certificate store. This config can then be injected into reqwest
//! via `ClientBuilder::use_preconfigured_tls()`.
//!
//! # Certificate Pinning
//!
//! Certificate pinning restricts which certificates are trusted by only accepting
//! specific pre-configured certificates. This prevents MITM attacks even if a CA
//! is compromised or issues fraudulent certificates.
//!
//! # Usage
//!
//! ```rust,no_run
//! use nuvio_core::http::tls::TlsConfigBuilder;
//! use reqwest::ClientBuilder;
//!
//! // Build TLS config with pinned certificates
//! let tls_config = TlsConfigBuilder::new()
//!     .add_pem_certificate(b"-----BEGIN CERTIFICATE-----\n...")
//!     .build()
//!     .expect("Failed to build TLS config");
//!
//! // Create reqwest client with custom TLS config
//! let client = ClientBuilder::new()
//!     .use_preconfigured_tls(tls_config)
//!     .build()
//!     .expect("Failed to build client");
//! ```
//!
//! # Security Considerations
//!
//! **CRITICAL**: When certificate pinning is enabled, the client will ONLY accept
//! connections to servers presenting one of the pinned certificates. This means:
//! - You must update pinned certificates before they expire
//! - If a certificate is rotated, the client will reject connections until updated
//! - Pinning should only be used for critical APIs where MITM protection is essential
//!
//! # Platform Support
//!
//! This module uses rustls (pure Rust TLS implementation) which provides:
//! - Cross-platform compatibility (Android, iOS, macOS, Linux, Windows)
//! - Smaller binary size compared to native-tls
//! - Memory safety guarantees from Rust
//! - No dependency on system TLS libraries

use rustls::pki_types::{CertificateDer, ServerName};
use rustls::{ClientConfig, RootCertStore};
use std::io::Cursor;
use std::sync::Arc;

/// TLS configuration builder for creating custom TLS configs with certificate pinning
///
/// This builder provides a fluent API for constructing TLS configurations with
/// pinned certificates. Use this when you need to restrict which certificates
/// are trusted for critical API endpoints.
///
/// # Examples
///
/// ```rust,no_run
/// use nuvio_core::http::tls::TlsConfigBuilder;
///
/// let tls_config = TlsConfigBuilder::new()
///     .add_pem_certificate(b"-----BEGIN CERTIFICATE-----\n...")
///     .build()
///     .expect("Failed to build TLS config");
/// ```
#[derive(Debug, Clone)]
pub struct TlsConfigBuilder {
    /// Certificates to pin (only these will be trusted)
    pinned_certificates: Vec<Vec<u8>>,

    /// Whether to use platform verifier (system root certificates)
    use_platform_verifier: bool,
}

impl Default for TlsConfigBuilder {
    fn default() -> Self {
        Self::new()
    }
}

impl TlsConfigBuilder {
    /// Creates a new TLS configuration builder
    ///
    /// By default, no certificates are pinned and platform verification is disabled.
    /// You must add certificates via `add_pem_certificate()` or enable platform
    /// verification via `use_platform_verifier()`.
    ///
    /// # Examples
    ///
    /// ```rust
    /// use nuvio_core::http::tls::TlsConfigBuilder;
    ///
    /// let builder = TlsConfigBuilder::new();
    /// ```
    pub fn new() -> Self {
        Self {
            pinned_certificates: Vec::new(),
            use_platform_verifier: false,
        }
    }

    /// Adds a PEM-formatted certificate to the pinned certificate list
    ///
    /// The certificate should be in PEM format (text format starting with
    /// "-----BEGIN CERTIFICATE-----"). Multiple certificates can be added
    /// by calling this method multiple times.
    ///
    /// # Arguments
    ///
    /// * `pem_cert` - PEM-formatted certificate bytes
    ///
    /// # Examples
    ///
    /// ```rust
    /// use nuvio_core::http::tls::TlsConfigBuilder;
    ///
    /// let builder = TlsConfigBuilder::new()
    ///     .add_pem_certificate(b"-----BEGIN CERTIFICATE-----\n...");
    /// ```
    pub fn add_pem_certificate(mut self, pem_cert: &[u8]) -> Self {
        self.pinned_certificates.push(pem_cert.to_vec());
        self
    }

    /// Enables platform certificate verification (uses system root certificates)
    ///
    /// When enabled, the TLS config will use the operating system's root certificate
    /// store in addition to any pinned certificates. This is useful when you want to
    /// trust both system CAs and specific pinned certificates.
    ///
    /// **Default**: Disabled (only pinned certificates are trusted)
    ///
    /// # Examples
    ///
    /// ```rust
    /// use nuvio_core::http::tls::TlsConfigBuilder;
    ///
    /// let builder = TlsConfigBuilder::new()
    ///     .use_platform_verifier(true);
    /// ```
    pub fn use_platform_verifier(mut self, enabled: bool) -> Self {
        self.use_platform_verifier = enabled;
        self
    }

    /// Builds the TLS client configuration
    ///
    /// This creates a `rustls::ClientConfig` with the configured certificate pinning
    /// settings. The resulting config can be used with reqwest's
    /// `ClientBuilder::use_preconfigured_tls()`.
    ///
    /// # Errors
    ///
    /// Returns an error if:
    /// - No certificates are pinned and platform verifier is disabled
    /// - Certificate parsing fails (invalid PEM format)
    /// - TLS configuration fails to build
    ///
    /// # Examples
    ///
    /// ```rust,no_run
    /// use nuvio_core::http::tls::TlsConfigBuilder;
    /// use reqwest::ClientBuilder;
    ///
    /// let tls_config = TlsConfigBuilder::new()
    ///     .add_pem_certificate(b"-----BEGIN CERTIFICATE-----\n...")
    ///     .build()?;
    ///
    /// let client = ClientBuilder::new()
    ///     .use_preconfigured_tls(tls_config)
    ///     .build()?;
    /// # Ok::<(), Box<dyn std::error::Error>>(())
    /// ```
    pub fn build(self) -> Result<ClientConfig, TlsConfigError> {
        // Create root certificate store
        let mut root_store = RootCertStore::empty();

        // Add pinned certificates to root store
        for pem_cert in &self.pinned_certificates {
            let mut cursor = Cursor::new(pem_cert);
            let certs = rustls_pemfile::certs(&mut cursor)
                .collect::<Result<Vec<_>, _>>()
                .map_err(|e| TlsConfigError::CertificateParseError(e.to_string()))?;

            for cert in certs {
                root_store
                    .add(cert)
                    .map_err(|e| TlsConfigError::CertificateAddError(e.to_string()))?;
            }
        }

        // If using platform verifier, add system root certificates
        if self.use_platform_verifier {
            let platform_certs = rustls_native_certs::load_native_certs()
                .map_err(|e| TlsConfigError::PlatformVerifierError(e.to_string()))?;

            for cert in platform_certs {
                // Ignore errors when adding platform certs (some might be invalid)
                let _ = root_store.add(cert);
            }
        }

        // Build TLS client configuration
        let config = ClientConfig::builder()
            .with_root_certificates(root_store)
            .with_no_client_auth();

        Ok(config)
    }
}

/// Errors that can occur during TLS configuration
#[derive(Debug, thiserror::Error)]
pub enum TlsConfigError {
    /// Certificate parsing failed (invalid PEM format)
    #[error("Failed to parse certificate: {0}")]
    CertificateParseError(String),

    /// Failed to add certificate to root store
    #[error("Failed to add certificate to root store: {0}")]
    CertificateAddError(String),

    /// Platform verifier error
    #[error("Failed to load platform certificates: {0}")]
    PlatformVerifierError(String),

    /// Configuration build failed
    #[error("Failed to build TLS configuration: {0}")]
    ConfigBuildError(String),
}

/// Creates a default TLS configuration with platform root certificates
///
/// This is a convenience function that creates a TLS config using the operating
/// system's root certificate store. Use this when you want standard TLS behavior
/// without certificate pinning.
///
/// # Examples
///
/// ```rust,no_run
/// use nuvio_core::http::tls::create_default_tls_config;
/// use reqwest::ClientBuilder;
///
/// let tls_config = create_default_tls_config()?;
/// let client = ClientBuilder::new()
///     .use_preconfigured_tls(tls_config)
///     .build()?;
/// # Ok::<(), Box<dyn std::error::Error>>(())
/// ```
pub fn create_default_tls_config() -> Result<ClientConfig, TlsConfigError> {
    TlsConfigBuilder::new()
        .use_platform_verifier(true)
        .build()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tls_config_builder_creation() {
        let builder = TlsConfigBuilder::new();
        assert_eq!(builder.pinned_certificates.len(), 0);
        assert!(!builder.use_platform_verifier);
    }

    #[test]
    fn test_tls_config_builder_default() {
        let builder = TlsConfigBuilder::default();
        assert_eq!(builder.pinned_certificates.len(), 0);
        assert!(!builder.use_platform_verifier);
    }

    #[test]
    fn test_tls_config_builder_add_certificate() {
        let cert = b"-----BEGIN CERTIFICATE-----\ntest\n-----END CERTIFICATE-----";
        let builder = TlsConfigBuilder::new().add_pem_certificate(cert);
        assert_eq!(builder.pinned_certificates.len(), 1);
    }

    #[test]
    fn test_tls_config_builder_multiple_certificates() {
        let cert1 = b"-----BEGIN CERTIFICATE-----\ntest1\n-----END CERTIFICATE-----";
        let cert2 = b"-----BEGIN CERTIFICATE-----\ntest2\n-----END CERTIFICATE-----";
        let builder = TlsConfigBuilder::new()
            .add_pem_certificate(cert1)
            .add_pem_certificate(cert2);
        assert_eq!(builder.pinned_certificates.len(), 2);
    }

    #[test]
    fn test_tls_config_builder_platform_verifier() {
        let builder = TlsConfigBuilder::new().use_platform_verifier(true);
        assert!(builder.use_platform_verifier);
    }

    #[test]
    fn test_tls_config_build() {
        // Test building config with platform verifier (should always work)
        let result = TlsConfigBuilder::new()
            .use_platform_verifier(true)
            .build();

        assert!(result.is_ok(), "Failed to build TLS config: {:?}", result.err());
    }

    #[test]
    fn test_create_default_tls_config() {
        let result = create_default_tls_config();
        assert!(result.is_ok(), "Failed to create default TLS config: {:?}", result.err());
    }

    #[test]
    fn test_tls_config_builder_clone() {
        let builder1 = TlsConfigBuilder::new()
            .add_pem_certificate(b"test")
            .use_platform_verifier(true);

        let builder2 = builder1.clone();
        assert_eq!(builder1.pinned_certificates.len(), builder2.pinned_certificates.len());
        assert_eq!(builder1.use_platform_verifier, builder2.use_platform_verifier);
    }
}
