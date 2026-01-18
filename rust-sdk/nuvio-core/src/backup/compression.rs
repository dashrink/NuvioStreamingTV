//! Compression utilities for backup data

use crate::backup::error::BackupError;
use flate2::Compression;
use flate2::read::{GzDecoder};
use flate2::write::GzEncoder;
use std::io::{Read, Write};

/// Compression manager for backup data
pub struct CompressionManager;

impl CompressionManager {
    /// Compress data using gzip
    pub fn compress(data: &[u8]) -> Result<Vec<u8>, BackupError> {
        let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
        encoder
            .write_all(data)
            .map_err(|e| BackupError::compression(format!("Failed to write data: {}", e)))?;
        encoder
            .finish()
            .map_err(|e| BackupError::compression(format!("Failed to finish compression: {}", e)))
    }

    /// Decompress gzip data
    pub fn decompress(compressed_data: &[u8]) -> Result<Vec<u8>, BackupError> {
        let mut decoder = GzDecoder::new(compressed_data);
        let mut decompressed = Vec::new();
        decoder
            .read_to_end(&mut decompressed)
            .map_err(|e| BackupError::compression(format!("Failed to decompress: {}", e)))?;
        Ok(decompressed)
    }

    /// Check if data appears to be gzip compressed
    pub fn is_compressed(data: &[u8]) -> bool {
        // Check for gzip magic number
        data.len() >= 2 && data[0] == 0x1f && data[1] == 0x8b
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compress_decompress() {
        let original = b"Hello, world! This is test data for compression.";
        let compressed = CompressionManager::compress(original).unwrap();

        // Compressed data should be smaller for this test data
        assert!(compressed.len() < original.len());

        let decompressed = CompressionManager::decompress(&compressed).unwrap();
        assert_eq!(original, decompressed.as_slice());
    }

    #[test]
    fn test_is_compressed() {
        let data = b"Regular uncompressed data";
        assert!(!CompressionManager::is_compressed(data));

        let compressed = CompressionManager::compress(b"Test data").unwrap();
        assert!(CompressionManager::is_compressed(&compressed));
    }

    #[test]
    fn test_compress_empty() {
        let empty: &[u8] = &[];
        let compressed = CompressionManager::compress(empty).unwrap();
        let decompressed = CompressionManager::decompress(&compressed).unwrap();
        assert_eq!(empty, decompressed.as_slice());
    }

    #[test]
    fn test_compress_large_data() {
        // Test with larger data
        let large_data: Vec<u8> = (0..10000).map(|i| (i % 256) as u8).collect();
        let compressed = CompressionManager::compress(&large_data).unwrap();
        let decompressed = CompressionManager::decompress(&compressed).unwrap();
        assert_eq!(large_data, decompressed);
    }

    #[test]
    fn test_decompress_invalid_data() {
        let invalid_data = b"Not compressed data";
        let result = CompressionManager::decompress(invalid_data);
        assert!(result.is_err());
    }
}
