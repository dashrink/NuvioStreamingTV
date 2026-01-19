#!/usr/bin/env bash
set -euo pipefail

# Script to generate Kotlin and Swift bindings from the Rust nuvio-core library
#
# This script uses the uniffi crate's bindgen_library function via the
# uniffi-bindgen binary in nuvio-core. No external uniffi-bindgen CLI required.
#
# Usage:
#   ./scripts/generate-bindings.sh           # Generate all bindings
#   ./scripts/generate-bindings.sh kotlin    # Generate Kotlin bindings only
#   ./scripts/generate-bindings.sh swift     # Generate Swift bindings only

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🦀 Generating FFI bindings for nuvio-core..."

# Parse arguments
LANGUAGE="${1:-all}"

# Navigate to project root
cd "$PROJECT_ROOT"

# Build the release library
echo "📦 Building Rust library..."
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

    echo "🔧 Generating $lang bindings using uniffi crate's bindgen_library..."

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
        echo "✅ Kotlin bindings generated in: bindings/kotlin/"
        ls -lh bindings/kotlin/*.kt 2>/dev/null || echo "   (no .kt files found)"
    else
        echo "❌ Kotlin binding generation failed"
        exit 1
    fi
fi

# Generate Swift bindings
if [[ "$LANGUAGE" == "all" ]] || [[ "$LANGUAGE" == "swift" ]]; then
    if generate_bindings "swift" "bindings/swift"; then
        echo "✅ Swift bindings generated in: bindings/swift/"
        ls -lh bindings/swift/*.swift 2>/dev/null || echo "   (no .swift files found)"
        ls -lh bindings/swift/*.h 2>/dev/null || echo "   (no .h files found)"
        ls -lh bindings/swift/*.modulemap 2>/dev/null || echo "   (no .modulemap files found)"
    else
        echo "❌ Swift binding generation failed"
        exit 1
    fi
fi

echo ""
echo "🎉 Binding generation complete!"
echo ""
echo "📝 Next steps:"
echo "   • Kotlin: Copy generated files to your Android project"
echo "   • Swift: Copy generated files to your Xcode project"
echo "   • Ensure the compiled library (.so/.dylib/.dll) is included in your app bundle"
