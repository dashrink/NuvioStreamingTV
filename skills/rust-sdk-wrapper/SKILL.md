---
name: Rust SDK Wrapper Expert
description: Specialized in building high-performance, idiomatic Rust wrappers for SDKs with a focus on cross-platform compatibility (iOS, Android, TVOS) using FFI and UniFFI.
---

# Rust SDK Wrapper Expert

This skill provides expertise in designing and implementing Rust wrappers for low-level SDKs or core logic meant to be shared across platforms.

## Core Principles
1. **Safety First**: Leverage Rust's ownership and type system to provide a memory-safe interface to potentially unsafe FFI calls.
2. **Idiomatic Design**: Ensure the Rust API feels natural to Rust developers, while keeping the FFI boundary clean for foreign languages.
3. **Cross-Platform Portability**: Prioritize tools and patterns that simplify bridging to Kotlin (Android) and Swift (iOS/macOS).

## Tools & Frameworks
- **UniFFI**: Preferred for generating multi-language bindings from a single UDL (Interface Definition Language) or proc-macros.
- **JNI-rs / JNI-devel**: For manual Android bridging when fine-grained control is needed.
- **Swift-bridge / cbindgen**: For specialized iOS/C integration.
- **Cargo-ndk / Cargo-lipo**: For cross-compiling to mobile targets.

## Implementation Patterns

### 1. The Core Wrapper
Encapsulate the underlying SDK in a safe Rust struct. Use `Arc` and `Mutex` where necessary to ensure thread safety across the FFI boundary.

```rust
pub struct MySdkWrapper {
    inner: *mut c_void, // Pointer to raw SDK
}

impl MySdkWrapper {
    pub fn new(config: SdkConfig) -> Result<Self, SdkError> {
        // Implementation
    }
}
```

### 2. Error Handling
Convert native error codes into a unified Rust `enum` using `thiserror`. Map these back to exceptions in Kotlin/Swift.

### 3. Async Integration
Rust `Future`s should be bridgeable. Use `tokio` or `async-executor` internally, and provide callback-based or reactive (Flow/Combine) interfaces at the FFI layer.

## Best Practices
- **Minimize FFI Crossings**: High-frequency calls across the bridge can be a bottleneck. Batch data or move high-frequency logic entirely into Rust.
- **Zero-Copy Data Transfer**: Use shared buffers or `rkyv` for efficient data serialization between Rust and the host language.
- **Automated Testing**: Test the Rust implementation in isolation, and use integration tests that exercise the generated bindings.
