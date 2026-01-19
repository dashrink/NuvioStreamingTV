//! UniFFI Binding Generator Binary
//!
//! This binary is used to generate Kotlin and Swift bindings from the
//! compiled Rust library. It wraps the uniffi-bindgen CLI functionality.
//!
//! # Usage
//!
//! ```bash
//! # Build the library first
//! cargo build --release
//!
//! # Run the binding generator
//! cargo run --bin uniffi-bindgen -- generate \
//!     --library target/release/libnuvio_core.so \
//!     --language kotlin \
//!     --out-dir bindings/kotlin
//! ```

fn main() {
    // In uniffi 0.30.0, you should use the uniffi-bindgen CLI directly
    // or use the uniffi_bindgen crate's library functions.
    // This binary is kept for compatibility but the recommended approach
    // is to use `cargo install uniffi-bindgen` and run it directly.
    
    eprintln!("This binary is deprecated in uniffi 0.30.0.");
    eprintln!("Please use the uniffi-bindgen CLI directly:");
    eprintln!("  cargo install uniffi-bindgen --version 0.30.0");
    eprintln!("  uniffi-bindgen generate --library <path> --language <lang> --out-dir <dir>");
    eprintln!("");
    eprintln!("Or use the generate-bindings.sh script in the rust-sdk directory.");
    
    std::process::exit(1);
}
