# Swift Bindings for Nuvio Core SDK

This directory will contain the generated Swift bindings once `uniffi-bindgen` is run.

## Expected Files

After running `../generate-bindings.sh`, you should see:

- `nuvio_core.swift` - Main generated Swift code with all FFI exports
- `nuvio_coreFFI.h` - C header file for FFI
- `nuvio_coreFFI.modulemap` - Module map for Swift import

## Module

The generated code will be in module: `NuvioCore`

## Status

**Note**: Bindings must be generated using the `uniffi-bindgen` tool. See `../README.md` for instructions.

If this directory is empty, run:
```bash
cd ../../
./generate-bindings.sh
```
