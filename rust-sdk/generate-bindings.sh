#!/bin/bash
# Generate Kotlin and Swift bindings for nuvio-core using uniffi crate's bindgen_library
#
# This script uses the uniffi crate's built-in binding generation (uniffi_bindgen_main)
# rather than an external uniffi-bindgen CLI tool. This approach is recommended as it:
# - Ensures version compatibility with the uniffi crate used by the library
# - Supports all external type features
# - Handles multiple UniFFI crates built into one library automatically
#
# Usage:
#   ./generate-bindings.sh           # Generate all bindings
#   ./generate-bindings.sh kotlin    # Generate Kotlin bindings only
#   ./generate-bindings.sh swift     # Generate Swift bindings only

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Generating UniFFI bindings for nuvio-core ==="

# Parse arguments
LANGUAGE="${1:-all}"

# Navigate to rust-sdk root
cd "$SCRIPT_DIR"

# Ensure the library is built
echo "Building nuvio-core library..."
cargo build --release

# Detect platform and library extension
if [[ "$OSTYPE" == "darwin"* ]]; then
    LIB_EXT="dylib"
    PLATFORM="macOS"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    LIB_EXT="so"
    PLATFORM="Linux"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "win32" ]]; then
    LIB_EXT="dll"
    PLATFORM="Windows"
else
    echo "❌ Unsupported platform: $OSTYPE"
    exit 1
fi

LIB_PATH="target/release/libnuvio_core.$LIB_EXT"

# On Windows, the library name might not have "lib" prefix
if [[ ! -f "$LIB_PATH" ]] && [[ "$PLATFORM" == "Windows" ]]; then
    LIB_PATH="target/release/nuvio_core.dll"
fi

if [[ ! -f "$LIB_PATH" ]]; then
    echo "❌ Library not found at: $LIB_PATH"
    echo "   Please ensure cargo build --release succeeded"
    exit 1
fi

echo "✅ Built library: $LIB_PATH (platform: $PLATFORM)"

# Create output directories
mkdir -p bindings/kotlin bindings/swift

# Function to generate bindings using uniffi crate's bindgen_library
generate_bindings() {
    local lang=$1
    local out_dir=$2

    echo "Generating $lang bindings using uniffi crate's bindgen_library..."

    # Use the uniffi-bindgen binary from nuvio-core which uses uniffi::uniffi_bindgen_main()
    # This internally uses the uniffi crate's library mode binding generation
    cargo run -p nuvio-core --features cli --bin uniffi-bindgen -- generate \
        --library "$LIB_PATH" \
        --language "$lang" \
        --out-dir "$out_dir" \
        --config nuvio-core/uniffi.toml

    return $?
}

# Generate Kotlin bindings
if [[ "$LANGUAGE" == "all" ]] || [[ "$LANGUAGE" == "kotlin" ]]; then
    if generate_bindings "kotlin" "bindings/kotlin"; then
        echo "✅ Kotlin bindings generated"
    else
        echo "❌ Kotlin binding generation failed"
        exit 1
    fi
fi

# Generate Swift bindings
if [[ "$LANGUAGE" == "all" ]] || [[ "$LANGUAGE" == "swift" ]]; then
    if generate_bindings "swift" "bindings/swift"; then
        echo "✅ Swift bindings generated"
    else
        echo "❌ Swift binding generation failed"
        exit 1
    fi
fi

echo "=== Bindings generated successfully ==="
echo "Kotlin bindings: bindings/kotlin/"
echo "Swift bindings: bindings/swift/"
ls -la bindings/kotlin/ 2>/dev/null || echo "(no kotlin files yet)"
ls -la bindings/swift/ 2>/dev/null || echo "(no swift files yet)"
