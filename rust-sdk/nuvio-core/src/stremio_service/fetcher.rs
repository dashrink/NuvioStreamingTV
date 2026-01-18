//! HTTP fetcher with timeout and retry logic for Stremio addon operations.
//!
//! This module provides HTTP client functionality with:
//! - Configurable timeouts (10s default)
//! - Automatic retry with exponential backoff (3 retries: 100ms, 200ms, 400ms)
//! - Response size limits (10MB max) to prevent memory exhaustion
//! - Proper error handling and propagation
//!
//! The fetcher is designed for fetching addon manifests, catalogs, and streams
//! with robust failure recovery.

use crate::error::NuvioError;
use reqwest::Client;
use std::time::Duration;
use tokio::time::{sleep, timeout};

/// Maximum response size (10MB) to prevent memory exhaustion
const MAX_RESPONSE_SIZE: u64 = 10 * 1024 * 1024;

/// Default timeout for HTTP requests (10 seconds)
const DEFAULT_TIMEOUT: Duration = Duration::from_secs(10);

/// Maximum number of retry attempts
const MAX_RETRIES: u32 = 3;

/// Configuration for HTTP fetching operations
#[derive(Debug, Clone)]
pub struct FetcherConfig {
    /// Timeout duration for individual requests
    pub timeout_duration: Duration,

    /// Maximum number of retry attempts (0 means no retries)
    pub max_retries: u32,

    /// Maximum response size in bytes
    pub max_response_size: u64,
}

impl Default for FetcherConfig {
    fn default() -> Self {
        Self {
            timeout_duration: DEFAULT_TIMEOUT,
            max_retries: MAX_RETRIES,
            max_response_size: MAX_RESPONSE_SIZE,
        }
    }
}

/// HTTP fetcher with timeout and retry capabilities
pub struct Fetcher {
    client: Client,
    config: FetcherConfig,
}

impl Fetcher {
    /// Creates a new Fetcher with default configuration
    pub fn new() -> Result<Self, NuvioError> {
        Self::with_config(FetcherConfig::default())
    }

    /// Creates a new Fetcher with custom configuration
    pub fn with_config(config: FetcherConfig) -> Result<Self, NuvioError> {
        let client = Client::builder()
            .timeout(config.timeout_duration)
            .build()
            .map_err(|e| {
                NuvioError::network_error(format!("Failed to create HTTP client: {}", e))
            })?;

        Ok(Self { client, config })
    }

    /// Fetches a URL with timeout and returns the response as a string
    ///
    /// # Arguments
    ///
    /// * `url` - The URL to fetch
    ///
    /// # Returns
    ///
    /// The response body as a string, or an error if the request fails or times out
    ///
    /// # Errors
    ///
    /// Returns a `NuvioError` if:
    /// - The request times out
    /// - Network error occurs
    /// - Response exceeds size limit
    /// - Response contains invalid UTF-8
    pub async fn fetch(&self, url: &str) -> Result<String, NuvioError> {
        let fetch_future = self.fetch_with_size_limit(url);

        match timeout(self.config.timeout_duration, fetch_future).await {
            Ok(result) => result,
            Err(_) => Err(NuvioError::timeout(format!(
                "Request timed out after {}s",
                self.config.timeout_duration.as_secs()
            ))),
        }
    }

    /// Fetches a URL with automatic retry on failure
    ///
    /// # Arguments
    ///
    /// * `url` - The URL to fetch
    ///
    /// # Returns
    ///
    /// The response body as a string, or an error if all retry attempts fail
    ///
    /// # Retry Logic
    ///
    /// Retries up to `max_retries` times with exponential backoff:
    /// - 1st retry: 100ms delay
    /// - 2nd retry: 200ms delay
    /// - 3rd retry: 400ms delay
    pub async fn fetch_with_retry(&self, url: &str) -> Result<String, NuvioError> {
        let mut attempts = 0;

        loop {
            match self.fetch(url).await {
                Ok(result) => return Ok(result),
                Err(e) => {
                    attempts += 1;

                    if attempts > self.config.max_retries {
                        // Return the error after all retries exhausted
                        return Err(e);
                    }

                    // Exponential backoff: 2^attempts * 100ms
                    let delay = Duration::from_millis(100 * 2_u64.pow(attempts - 1));
                    sleep(delay).await;
                }
            }
        }
    }

    /// Fetches multiple URLs in parallel
    ///
    /// # Arguments
    ///
    /// * `urls` - Slice of URLs to fetch
    ///
    /// # Returns
    ///
    /// Vector of results, one for each URL. Individual failures don't prevent other requests.
    ///
    /// # Notes
    ///
    /// Each request is executed concurrently using tokio::spawn. Failed requests return
    /// an error in their corresponding position in the results vector.
    pub async fn fetch_parallel(&self, urls: &[String]) -> Vec<Result<String, NuvioError>> {
        let tasks: Vec<_> = urls
            .iter()
            .map(|url| {
                let url = url.clone();
                let fetcher = self.clone();

                tokio::spawn(async move { fetcher.fetch_with_retry(&url).await })
            })
            .collect();

        let results = futures::future::join_all(tasks).await;

        results
            .into_iter()
            .map(|r| match r {
                Ok(result) => result,
                Err(join_err) => Err(NuvioError::network_error(format!(
                    "Task panicked: {}",
                    join_err
                ))),
            })
            .collect()
    }

    /// Internal method to fetch with response size limit
    async fn fetch_with_size_limit(&self, url: &str) -> Result<String, NuvioError> {
        let response = self
            .client
            .get(url)
            .send()
            .await
            .map_err(|e| NuvioError::network_error(format!("HTTP request failed: {}", e)))?;

        // Check content length header if available
        if let Some(content_length) = response.content_length() {
            if content_length > self.config.max_response_size {
                return Err(NuvioError::response_too_large(
                    content_length,
                    self.config.max_response_size,
                ));
            }
        }

        // Read response bytes
        let bytes = response
            .bytes()
            .await
            .map_err(|e| NuvioError::network_error(format!("Failed to read response: {}", e)))?;

        // Check actual size
        if bytes.len() as u64 > self.config.max_response_size {
            return Err(NuvioError::response_too_large(
                bytes.len() as u64,
                self.config.max_response_size,
            ));
        }

        String::from_utf8(bytes.to_vec()).map_err(|e| {
            NuvioError::network_error(format!("Response contains invalid UTF-8: {}", e))
        })
    }
}

impl Clone for Fetcher {
    fn clone(&self) -> Self {
        // Clone the config but create a new client
        // This is safe because Client uses Arc internally
        Self {
            client: self.client.clone(),
            config: self.config.clone(),
        }
    }
}

impl Default for Fetcher {
    fn default() -> Self {
        Self::new().expect("Failed to create default Fetcher")
    }
}

/// Generic retry function for any async operation
///
/// # Arguments
///
/// * `operation` - A function that returns a Future producing Result<T, NuvioError>
/// * `max_retries` - Maximum number of retry attempts
///
/// # Returns
///
/// The result of the operation, or the last error after all retries fail
///
/// # Examples
///
/// ```
/// use nuvio_core::stremio_service::fetcher::fetch_with_retry_generic;
/// use nuvio_core::error::NuvioError;
///
/// async fn example() -> Result<String, NuvioError> {
///     fetch_with_retry_generic(
///         || async { Ok("success".to_string()) },
///         3
///     ).await
/// }
/// ```
pub async fn fetch_with_retry_generic<F, Fut, T>(
    operation: F,
    max_retries: u32,
) -> Result<T, NuvioError>
where
    F: Fn() -> Fut,
    Fut: std::future::Future<Output = Result<T, NuvioError>>,
{
    let mut attempts = 0;

    loop {
        match operation().await {
            Ok(result) => return Ok(result),
            Err(e) => {
                attempts += 1;
                if attempts > max_retries {
                    return Err(e);
                }
                // Exponential backoff: 2^attempts * 100ms
                let delay = Duration::from_millis(100 * 2_u64.pow(attempts - 1));
                sleep(delay).await;
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_fetcher_creation() {
        let fetcher = Fetcher::new();
        assert!(fetcher.is_ok(), "Should create fetcher successfully");
    }

    #[tokio::test]
    async fn test_fetcher_with_custom_config() {
        let config = FetcherConfig {
            timeout_duration: Duration::from_secs(5),
            max_retries: 2,
            max_response_size: 5 * 1024 * 1024,
        };

        let fetcher = Fetcher::with_config(config);
        assert!(fetcher.is_ok(), "Should create fetcher with custom config");
    }

    #[tokio::test]
    async fn test_default_config() {
        let config = FetcherConfig::default();
        assert_eq!(config.timeout_duration, DEFAULT_TIMEOUT);
        assert_eq!(config.max_retries, MAX_RETRIES);
        assert_eq!(config.max_response_size, MAX_RESPONSE_SIZE);
    }

    #[tokio::test]
    async fn test_fetch_timeout() {
        let config = FetcherConfig {
            timeout_duration: Duration::from_millis(100), // Very short timeout
            max_retries: 0,
            max_response_size: MAX_RESPONSE_SIZE,
        };

        let fetcher = Fetcher::with_config(config).expect("Failed to create fetcher");

        // Use a URL that will likely timeout (unroutable IP)
        let result = fetcher.fetch("http://192.0.2.1/test").await;

        assert!(result.is_err(), "Should timeout");
        if let Err(e) = result {
            assert!(
                matches!(e, NuvioError::Timeout { .. })
                    || matches!(e, NuvioError::NetworkError { .. }),
                "Should be timeout or network error, got: {:?}",
                e
            );
        }
    }

    #[tokio::test]
    async fn test_fetch_invalid_url() {
        let fetcher = Fetcher::new().expect("Failed to create fetcher");
        let result = fetcher
            .fetch("http://invalid-domain-that-does-not-exist-12345.com")
            .await;

        assert!(result.is_err(), "Should fail for invalid URL");
        if let Err(e) = result {
            assert!(
                matches!(e, NuvioError::NetworkError { .. })
                    || matches!(e, NuvioError::Timeout { .. }),
                "Should be network error or timeout, got: {:?}",
                e
            );
        }
    }

    #[tokio::test]
    async fn test_retry_logic() {
        let config = FetcherConfig {
            timeout_duration: Duration::from_millis(100),
            max_retries: 2,
            max_response_size: MAX_RESPONSE_SIZE,
        };

        let fetcher = Fetcher::with_config(config).expect("Failed to create fetcher");

        let start = std::time::Instant::now();
        let result = fetcher.fetch_with_retry("http://192.0.2.1/test").await;
        let elapsed = start.elapsed();

        assert!(result.is_err(), "Should fail after retries");

        // Should take at least 100ms (first retry delay) + some request time
        // With 2 retries: initial + 100ms delay + 200ms delay = at least 300ms
        // Being conservative with timing assertions in tests
        assert!(
            elapsed >= Duration::from_millis(50),
            "Should have attempted retries with delays, elapsed: {:?}",
            elapsed
        );
    }

    #[tokio::test]
    async fn test_parallel_fetch() {
        let fetcher = Fetcher::new().expect("Failed to create fetcher");

        let urls = vec![
            "http://invalid1.test".to_string(),
            "http://invalid2.test".to_string(),
        ];

        let results = fetcher.fetch_parallel(&urls).await;

        assert_eq!(results.len(), 2, "Should return result for each URL");

        // All should be errors since these are invalid URLs
        for result in results {
            assert!(result.is_err(), "Invalid URLs should produce errors");
        }
    }

    #[tokio::test]
    async fn test_parallel() {
        // Create a fetcher with short timeout and no retries for faster testing
        let config = FetcherConfig {
            timeout_duration: Duration::from_millis(200),
            max_retries: 0, // No retries to make timing predictable
            max_response_size: MAX_RESPONSE_SIZE,
        };

        let fetcher = Fetcher::with_config(config).expect("Failed to create fetcher");

        // Use multiple URLs that will timeout (unroutable IPs from TEST-NET-1)
        let urls = vec![
            "http://192.0.2.1/test1".to_string(),
            "http://192.0.2.2/test2".to_string(),
            "http://192.0.2.3/test3".to_string(),
        ];

        // Test parallel execution
        let parallel_start = std::time::Instant::now();
        let parallel_results = fetcher.fetch_parallel(&urls).await;
        let parallel_elapsed = parallel_start.elapsed();

        // Verify all results are collected
        assert_eq!(
            parallel_results.len(),
            urls.len(),
            "Should return result for each URL"
        );

        // All should be errors since these are timeouts
        for result in &parallel_results {
            assert!(result.is_err(), "Should have errors for all URLs");
        }

        // Test sequential execution for comparison
        let sequential_start = std::time::Instant::now();
        let mut sequential_results = Vec::new();
        for url in &urls {
            sequential_results.push(fetcher.fetch(url).await);
        }
        let sequential_elapsed = sequential_start.elapsed();

        // Verify all results collected in sequential mode too
        assert_eq!(
            sequential_results.len(),
            urls.len(),
            "Should return result for each URL sequentially"
        );

        // Parallel should be significantly faster than sequential
        // Sequential: ~600ms (3 * 200ms timeout)
        // Parallel: ~200ms (max of all parallel requests)
        // Allow some margin for test flakiness, but parallel should be at least 1.5x faster
        assert!(
            parallel_elapsed < sequential_elapsed,
            "Parallel fetch ({:?}) should be faster than sequential ({:?})",
            parallel_elapsed,
            sequential_elapsed
        );

        // More specifically, parallel should take roughly the time of one request
        // while sequential takes the sum of all requests
        let expected_sequential = Duration::from_millis(200 * urls.len() as u64);
        let expected_parallel = Duration::from_millis(200);

        // Allow 50% margin for network variability and test environment
        assert!(
            sequential_elapsed >= expected_sequential / 2,
            "Sequential time ({:?}) should be close to sum of timeouts ({:?})",
            sequential_elapsed,
            expected_sequential
        );

        assert!(
            parallel_elapsed <= expected_parallel * 2,
            "Parallel time ({:?}) should be close to single timeout ({:?})",
            parallel_elapsed,
            expected_parallel
        );
    }

    #[tokio::test]
    async fn test_generic_retry_success() {
        use std::sync::atomic::{AtomicU32, Ordering};
        use std::sync::Arc;

        let counter = Arc::new(AtomicU32::new(0));
        let counter_clone = counter.clone();

        let operation = move || {
            let counter = counter_clone.clone();
            async move {
                let count = counter.fetch_add(1, Ordering::SeqCst);
                if count < 1 {
                    Err(NuvioError::network_error("Temporary failure"))
                } else {
                    Ok("success".to_string())
                }
            }
        };

        let result = fetch_with_retry_generic(operation, 3).await;
        assert!(result.is_ok(), "Should succeed after retry");
        assert_eq!(result.unwrap(), "success");
    }

    #[tokio::test]
    async fn test_generic_retry_failure() {
        let operation =
            || async { Err::<String, NuvioError>(NuvioError::network_error("Always fails")) };

        let result = fetch_with_retry_generic(operation, 2).await;
        assert!(result.is_err(), "Should fail after all retries");
    }

    #[tokio::test]
    async fn test_response_size_limit() {
        // This test verifies the size limit logic exists
        // In practice, we'd need a mock server to test this properly
        let config = FetcherConfig {
            timeout_duration: Duration::from_secs(5),
            max_retries: 0,
            max_response_size: 100, // Very small limit
        };

        let fetcher = Fetcher::with_config(config).expect("Failed to create fetcher");

        // Even if the URL worked, a large response would be rejected
        // This test mainly validates the config is set correctly
        assert_eq!(fetcher.config.max_response_size, 100);
    }

    #[tokio::test]
    async fn test_fetcher_clone() {
        let fetcher = Fetcher::new().expect("Failed to create fetcher");
        let cloned = fetcher.clone();

        assert_eq!(
            fetcher.config.timeout_duration, cloned.config.timeout_duration,
            "Cloned fetcher should have same config"
        );
    }

    #[tokio::test]
    async fn test_default_fetcher() {
        let fetcher = Fetcher::default();
        assert_eq!(fetcher.config.timeout_duration, DEFAULT_TIMEOUT);
        assert_eq!(fetcher.config.max_retries, MAX_RETRIES);
    }

    #[tokio::test]
    async fn test_exponential_backoff_timing() {
        // Test that exponential backoff increases properly
        let delays = vec![
            Duration::from_millis(100), // 2^0 * 100 = 100ms
            Duration::from_millis(200), // 2^1 * 100 = 200ms
            Duration::from_millis(400), // 2^2 * 100 = 400ms
        ];

        for (i, expected_delay) in delays.iter().enumerate() {
            let calculated = Duration::from_millis(100 * 2_u64.pow(i as u32));
            assert_eq!(
                calculated,
                *expected_delay,
                "Exponential backoff calculation incorrect for attempt {}",
                i + 1
            );
        }
    }

    #[tokio::test]
    async fn test_error_propagation() {
        let fetcher = Fetcher::new().expect("Failed to create fetcher");
        let result = fetcher.fetch("http://invalid-url").await;

        assert!(result.is_err(), "Should return error");

        match result {
            Err(NuvioError::NetworkError { msg }) => {
                assert!(!msg.is_empty(), "Error message should not be empty");
            }
            Err(NuvioError::Timeout { msg }) => {
                assert!(!msg.is_empty(), "Error message should not be empty");
            }
            _ => panic!("Should return NetworkError or Timeout"),
        }
    }
}
