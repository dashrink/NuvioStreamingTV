//! UniFFI Binding Generator Binary
//!
//! This binary provides the uniffi-bindgen CLI functionality using the
//! uniffi crate's `uniffi_bindgen_main()` function. It generates Kotlin
//! and Swift bindings from the compiled Rust library.
//!
//! # Usage
//!
//! ```bash
//! # Build the library first
//! cargo build --release
//!
//! # Run the binding generator (from the nuvio-core directory)
//! cargo run --bin uniffi-bindgen --features cli -- generate \
//!     --library ../target/release/libnuvio_core.so \
//!     --language kotlin \
//!     --out-dir ../bindings/kotlin
//!
//! # Or generate Swift bindings
//! cargo run --bin uniffi-bindgen --features cli -- generate \
//!     --library ../target/release/libnuvio_core.dylib \
//!     --language swift \
//!     --out-dir ../bindings/swift
//! ```
//!
//! # Library Mode
//!
//! This binary uses UniFFI's library mode (`--library` flag) which is the
//! recommended approach as it:
//! - Automatically handles multiple UniFFI crates built into one library
//! - Supports all external type features
//! - Is more convenient than specifying UDL files directly

fn main() {
    uniffi::uniffi_bindgen_main()
}
