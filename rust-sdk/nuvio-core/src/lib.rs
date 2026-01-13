// Nuvio Core SDK
//
// This library provides the foundational types and FFI layer for the Nuvio Streaming TV SDK.
// It uses UniFFI to generate Kotlin and Swift bindings for cross-platform mobile development.

// Re-export uniffi for use throughout the crate
pub use uniffi;

// Domain types module
pub mod types;

// Error types module
pub mod error;

// UniFFI setup - this macro generates the FFI scaffolding
uniffi::setup_scaffolding!();

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_crate_compiles() {
        // Basic smoke test to ensure the crate compiles
        assert!(true);
    }
}
