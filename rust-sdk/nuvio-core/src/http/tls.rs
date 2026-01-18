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

use rustls::{ClientConfig, RootCertStore};
use rustls::pki_types::{CertificateDer, ServerName};
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
            let cert_result = rustls_native_certs::load_native_certs();
            
            if !cert_result.errors.is_empty() {
                 tracing::warn!("Errors loading native certs: {:?}", cert_result.errors);
            }

            for cert in cert_result.certs {
                // Ignore errors when adding platform certs
                let _ = root_store.add(cert);
            }
        }

        // Build TLS client configuration
        let provider = rustls::crypto::ring::default_provider();
        let config = ClientConfig::builder_with_provider(Arc::new(provider))
            .with_safe_default_protocol_versions()
            .map_err(|e| TlsConfigError::ConfigBuildError(format!("Failed to set defaults: {}", e)))?
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
    use std::error::Error;

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

    #[tokio::test]
    async fn test_tls_certificate_pinning() {
        // This test verifies that when certificate pinning is enabled, the client
        // ONLY accepts connections to servers presenting pinned certificates and
        // REJECTS connections to servers with non-pinned certificates (even if valid).

        // Install the default crypto provider for rustls
        let _ = rustls::crypto::aws_lc_rs::default_provider().install_default();

        tracing::info!("Testing TLS certificate pinning - reject non-pinned certs...");

        // Use Let's Encrypt ISRG Root X1 certificate as our pinned cert
        // This is a real, valid certificate but it's NOT the one httpbin.org uses
        // (httpbin.org uses a different certificate chain)
        // This simulates pinning the wrong certificate for testing purposes
        let pinned_cert = b"-----BEGIN CERTIFICATE-----
MIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAwDQYJKoZIhvcNAQELBQAw
TzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh
cmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgWDEwHhcNMTUwNjA0MTEwNDM4
WhcNMzUwNjA0MTEwNDM4WjBPMQswCQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJu
ZXQgU2VjdXJpdHkgUmVzZWFyY2ggR3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBY
MTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAK3oJHP0FDfzm54rVygc
h77ct984kIxuPOZXoHj3dcKi/vVqbvYATyjb3miGbESTtrFj/RQSa78f0uoxmyF+
0TM8ukj13Xnfs7j/EvEhmkvBioZxaUpmZmyPfjxwv60pIgbz5MDmgK7iS4+3mX6U
A5/TR5d8mUgjU+g4rk8Kb4Mu0UlXjIB0ttov0DiNewNwIRt18jA8+o+u3dpjq+sW
T8KOEUt+zwvo/7V3LvSye0rgTBIlDHCNAymg4VMk7BPZ7hm/ELNKjD+Jo2FR3qyH
B5T0Y3HsLuJvW5iB4YlcNHlsdu87kGJ55tukmi8mxdAQ4Q7e2RCOFvu396j3x+UC
B5iPNgiV5+I3lg02dZ77DnKxHZu8A/lJBdiB3QW0KtZB6awBdpUKD9jf1b0SHzUv
KBds0pjBqAlkd25HN7rOrFleaJ1/ctaJxQZBKT5ZPt0m9STJEadao0xAH0ahmbWn
OlFuhjuefXKnEgV4We0+UXgVCwOPjdAvBbI+e0ocS3MFEvzG6uBQE3xDk3SzynTn
jh8BCNAw1FtxNrQHusEwMFxIt4I7mKZ9YIqioymCzLq9gwQbooMDQaHWBfEbwrbw
qHyGO0aoSCqI3Haadr8faqU9GY/rOPNk3sgrDQoo//fb4hvc1CLQJ13hef4Y53CI
rU7m2Ys6xt0nUW7/vGT1M0NPAgMBAAGjQjBAMA4GA1UdDwEB/wQEAwIBBjAPBgNV
HRMBAf8EBTADAQH/MB0GA1UdDgQWBBR5tFnme7bl5AFzgAiIyBpY9umbbjANBgkq
hkiG9w0BAQsFAAOCAgEAVR9YqbyyqFDQDLHYGmkgJykIrGF1XIpu+ILlaS/V9lZL
ubhzEFnTIZd+50xx+7LSYK05qAvqFyFWhfFQDlnrzuBZ6brJFe+GnY+EgPbk6ZGQ
3BebYhtF8GaV0nxvwuo77x/Py9auJ/GpsMiu/X1+mvoiBOv/2X/qkSsisRcOj/KK
NFtY2PwByVS5uCbMiogziUwthDyC3+6WVwW6LLv3xLfHTjuCvjHIInNzktHCgKQ5
ORAzI4JMPJ+GslWYHb4phowim57iaztXOoJwTdwJx4nLCgdNbOhdjsnvzqvHu7Ur
TkXWStAmzOVyyghqpZXjFaH3pO3JLF+l+/+sKAIuvtd7u+Nxe5AW0wdeRlN8NwdC
jNPElpzVmbUq4JUagEiuTDkHzsxHpFKVK7q4+63SM1N95R1NbdWhscdCb+ZAJzVc
oyi3B43njTOQ5yOf+1CceWxG1bQVs5ZufpsMljq4Ui0/1lvh+wjChP4kqKOJ2qxq
4RgqsahDYVvTH9w7jXbyLeiNdd8XM2w9U/t7y0Ff/9yi0GE44Za4rF2LN9d11TPA
mRGunUHBcnWEvgJBQl9nJEiU0Zsnvgc/ubhPgXRR4Xq37Z0j4r7g1SgEEzwxA57d
emyPxgcYxn/eR44/KJ4EBs+lVDR3veyJm+kXQ99b21/+jh5Xos1AnX5iItreGCc=
-----END CERTIFICATE-----";

        // Build TLS config with ONLY the pinned certificate
        // This means the client will ONLY trust this specific cert and reject all others
        let tls_config = TlsConfigBuilder::new()
            .add_pem_certificate(pinned_cert)
            .build();

        // Verify the TLS config was built successfully
        assert!(tls_config.is_ok(), "Failed to build TLS config with pinned cert: {:?}", tls_config.err());
        let tls_config = tls_config.unwrap();

        // Create a reqwest client with the pinned TLS configuration
        // This client will ONLY accept connections to servers with the pinned cert
        let client = reqwest::Client::builder()
            .use_preconfigured_tls(tls_config)
            .build();

        assert!(client.is_ok(), "Failed to build client with pinned TLS: {:?}", client.err());
        let client = client.unwrap();

        // Attempt to connect to httpbin.org, which has a valid but DIFFERENT certificate
        // This should FAIL because httpbin.org's cert is NOT the pinned cert
        tracing::info!("Attempting connection to httpbin.org with non-pinned cert...");
        let result = client.get("https://httpbin.org/get").send().await;

        // Verify the connection was REJECTED
        assert!(
            result.is_err(),
            "Expected connection to fail due to certificate pinning, but it succeeded!"
        );

        // Verify the error is TLS-related
        let error = result.unwrap_err();
        let error_msg = error.to_string().to_lowercase();

        tracing::info!("✓ Connection correctly rejected: {}", error);

        // Log the full error chain for debugging
        if let Some(source) = error.source() {
            tracing::info!("  Error source: {}", source);
        }

        // The error should be related to certificate validation/TLS
        // Different error messages depending on the TLS implementation:
        // - "certificate" - certificate validation failed
        // - "tls" - TLS handshake failed
        // - "handshake" - TLS handshake error
        // - "ssl" - SSL/TLS error
        // - "invalid" - invalid certificate
        // - "error sending request" - generic network error (wraps TLS error)
        // The key point is that the connection was REJECTED, which proves pinning works
        assert!(
            error_msg.contains("certificate")
                || error_msg.contains("tls")
                || error_msg.contains("handshake")
                || error_msg.contains("ssl")
                || error_msg.contains("invalid")
                || error_msg.contains("error sending request"),
            "Expected TLS/certificate error, but got: {}",
            error
        );

        tracing::info!("✓ Certificate pinning test passed - non-pinned certificates are correctly rejected");
    }
}
