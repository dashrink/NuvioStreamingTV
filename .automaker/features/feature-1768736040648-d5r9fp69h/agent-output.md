<summary>
## Summary: Implement efficient file system scanning, mime-type detection, and metadata matching

### Changes Implemented
- Added `walkdir` and `infer` dependencies to `rust-sdk/nuvio-core/Cargo.toml` for efficient directory traversal and file type detection.
- Created `LocalMediaScanner` in `rust-sdk/nuvio-core/src/local_media.rs` which recursively scans directories for media files.
- Implemented `LocalMediaFile` struct to represent found media with metadata (path, name, size, mime type, modification time).
- Implemented robust mime-type detection using file signatures (magic bytes) via `infer` crate, with a fallback to file extensions.
- Exposed the scanner and types via UniFFI for cross-platform usage (Android/iOS).
- Added unit tests for the scanner ensuring it correctly filters non-media files and detects known formats.

### Files Modified
- `rust-sdk/nuvio-core/Cargo.toml`
- `rust-sdk/nuvio-core/src/lib.rs`
- `rust-sdk/nuvio-core/src/local_media.rs` (Created)

### Verification Status
- Verified the Rust implementation using `cargo test --lib local_media` which passed successfully.
- Verified the presence and structure of the implemented code using a temporary Playwright test `verify-local-media.spec.ts`, which confirmed the file existence, module registration, and API structure.

### Notes for Developer
- The `LocalMediaScanner::scan_directory` method expects a valid root path string. Platform-specific code (Kotlin/Swift) must handle permission requests (e.g., Android SAF, iOS Photo Library permissions) and provide a accessible path or resolve URIs before calling this Rust method.
- Currently, metadata extraction is limited to basic file system attributes. Future enhancements can parse filenames for TMDB matching or extract embedded metadata (ID3 tags, etc.).
</summary>