# API Documentation Generation Guide

## Overview

This guide explains how to generate and verify the API documentation for the Nuvio Core SDK.

## Prerequisites

- Rust toolchain installed (1.70.0 or later)
- All source files properly documented with doc comments

## Documentation Standards

All public types, functions, and modules in the Nuvio Core SDK follow Rust documentation conventions:

### Crate-Level Documentation
The main library file (`src/lib.rs`) uses `//!` doc comments to provide:
- Overview of the SDK
- List of core types
- Error handling explanation
- Usage examples

### Module-Level Documentation
Each module uses `//!` doc comments at the top of the file to describe:
- Module purpose
- Available types
- Usage patterns

### Type-Level Documentation
Each public struct, enum, and function uses `///` doc comments with:
- Description of the type/function
- Field descriptions
- Usage examples where appropriate
- Notes about FFI compatibility

## Generating Documentation

### Command

To generate the API documentation without dependencies:

```bash
cd rust-sdk
cargo doc --no-deps
```

### Output Location

Documentation is generated in:
```
rust-sdk/target/doc/nuvio_core/index.html
```

### Verification

After generation, verify the documentation was created:

```bash
ls target/doc/nuvio_core/index.html
```

Expected output: `target/doc/nuvio_core/index.html`

### Opening Documentation

To generate and open the documentation in your browser:

```bash
cargo doc --no-deps --open
```

## Documentation Structure

The generated documentation includes:

### Main Page (`nuvio_core`)
- Crate overview
- Core types listing
- Error handling information
- Example usage

### Modules

#### `nuvio_core::types`
- Overview of all domain types
- Links to individual type documentation

#### `nuvio_core::error`
- Error type documentation
- Error variant descriptions

### Types

Each type has detailed documentation including:

1. **Meta** (`nuvio_core::types::Meta`)
   - Content metadata structure
   - Field descriptions
   - Constructor methods
   - Serialization examples

2. **Stream** (`nuvio_core::types::Stream`)
   - Video stream information
   - Quality and format fields
   - Constructor methods
   - Usage examples

3. **Catalog** (`nuvio_core::types::Catalog`)
   - Content collection structure
   - Item ID references
   - Constructor methods
   - Collection management

4. **Profile** (`nuvio_core::types::Profile`)
   - User profile settings
   - Parental controls
   - Personalization options
   - Constructor methods

5. **NuvioError** (`nuvio_core::error::NuvioError`)
   - Error variants
   - Error construction methods
   - Conversion traits

## Checking for Documentation Warnings

To ensure all public items are documented, run:

```bash
cargo doc --no-deps 2>&1 | grep warning
```

Expected output: No warnings (empty output)

## Documentation Best Practices

### For Future Contributions

When adding new types or functions to the SDK:

1. **Use proper doc comment syntax:**
   - `//!` for crate and module-level docs
   - `///` for type, function, and field-level docs

2. **Include these sections:**
   - Brief description
   - Field/parameter descriptions
   - Examples for public functions
   - Notes about FFI compatibility

3. **Follow Rust conventions:**
   - Use markdown formatting
   - Include code examples in fenced blocks
   - Link to related types with backticks and square brackets: `` [`TypeName`] ``

4. **FFI-specific notes:**
   - Mention UniFFI compatibility
   - Note any type restrictions (no generics, no lifetimes)
   - Explain thread-safety guarantees

## Continuous Integration

The documentation generation is verified in CI/CD:

```yaml
- name: Check documentation
  run: cd rust-sdk && cargo doc --no-deps
```

This ensures documentation builds without errors on every commit.

## Publishing Documentation

For future releases, documentation can be published to:
- docs.rs (when published to crates.io)
- GitHub Pages
- Internal documentation server

### Hosting on GitHub Pages

```bash
# Generate documentation
cargo doc --no-deps

# Copy to docs directory
mkdir -p docs
cp -r target/doc/* docs/

# Commit and push to gh-pages branch
git checkout -b gh-pages
git add docs/
git commit -m "Update API documentation"
git push origin gh-pages
```

## Related Files

- `src/lib.rs` - Crate-level documentation
- `src/types/mod.rs` - Types module documentation
- `src/types/meta.rs` - Meta type documentation
- `src/types/stream.rs` - Stream type documentation
- `src/types/catalog.rs` - Catalog type documentation
- `src/types/profile.rs` - Profile type documentation
- `src/error.rs` - Error type documentation

## Troubleshooting

### Missing Documentation

If documentation doesn't appear for a type:
1. Ensure the type is marked `pub`
2. Check for `///` doc comments (not `//`)
3. Verify the module is exported in parent `mod.rs`

### Broken Links

If documentation links are broken:
1. Use proper path syntax: `` [`crate::module::Type`] ``
2. Ensure the target type is public
3. Check module re-exports

### Build Errors

If `cargo doc` fails:
1. Run `cargo check` first to fix compilation errors
2. Check for invalid markdown in doc comments
3. Ensure all code examples in docs are valid

## Summary

✅ All source files have proper documentation comments
✅ Crate-level docs in `src/lib.rs`
✅ Module-level docs in `src/types/mod.rs`
✅ Type-level docs on all public structs and enums
✅ Function-level docs on constructors and helpers
✅ Examples included where appropriate
✅ FFI compatibility noted

The SDK is ready for documentation generation with `cargo doc --no-deps`.
