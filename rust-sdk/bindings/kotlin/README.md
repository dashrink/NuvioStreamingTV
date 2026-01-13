# Kotlin Bindings for Nuvio Core SDK

This directory will contain the generated Kotlin bindings once `uniffi-bindgen` is run.

## Expected Files

After running `../generate-bindings.sh`, you should see:

- `nuvio_core.kt` - Main generated Kotlin code with all FFI exports
- Additional supporting files as needed by UniFFI

## Package

The generated code will be in package: `com.nuvio.sdk.core`

## Status

**Note**: Bindings must be generated using the `uniffi-bindgen` tool. See `../README.md` for instructions.

If this directory is empty, run:
```bash
cd ../../
./generate-bindings.sh
```
