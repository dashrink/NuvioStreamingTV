#!/bin/bash
# Generate Kotlin and Swift bindings for nuvio-core using uniffi-bindgen
#
# This script must be run after building the library:
#   cargo build --release
#   ./generate-bindings.sh
#
# Or use the shortcut:
#   cargo build --features uniffi-bindgen

set -e

echo "=== Generating UniFFI bindings for nuvio-core ==="

# Change to the nuvio-core directory
cd "$(dirname "$0")/nuvio-core"

# Ensure the library is built
echo "Building nuvio-core library..."
cargo build --release

# Create output directories
mkdir -p ../bindings/kotlin ../bindings/swift

# Generate Kotlin bindings
echo "Generating Kotlin bindings..."
cargo run --bin uniffi-bindgen generate \
    --library ../target/release/libnuvio_core.so \
    --language kotlin \
    --out-dir ../bindings/kotlin \
    --config uniffi.toml \
    || cargo run --bin uniffi-bindgen generate \
       --library ../target/release/libnuvio_core.dylib \
       --language kotlin \
       --out-dir ../bindings/kotlin \
       --config uniffi.toml \
    || cargo run --bin uniffi-bindgen generate \
       --library ../target/release/nuvio_core.dll \
       --language kotlin \
       --out-dir ../bindings/kotlin \
       --config uniffi.toml

# Generate Swift bindings
echo "Generating Swift bindings..."
cargo run --bin uniffi-bindgen generate \
    --library ../target/release/libnuvio_core.so \
    --language swift \
    --out-dir ../bindings/swift \
    --config uniffi.toml \
    || cargo run --bin uniffi-bindgen generate \
       --library ../target/release/libnuvio_core.dylib \
       --language swift \
       --out-dir ../bindings/swift \
       --config uniffi.toml \
    || cargo run --bin uniffi-bindgen generate \
       --library ../target/release/nuvio_core.dll \
       --language swift \
       --out-dir ../bindings/swift \
       --config uniffi.toml

echo "=== Bindings generated successfully ==="
echo "Kotlin bindings: bindings/kotlin/"
echo "Swift bindings: bindings/swift/"
ls -la ../bindings/kotlin/
ls -la ../bindings/swift/
