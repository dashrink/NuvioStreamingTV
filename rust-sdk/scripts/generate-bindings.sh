#!/usr/bin/env bash
set -euo pipefail

# Script to generate Kotlin and Swift bindings from the Rust nuvio-core library
# Requires: uniffi-bindgen CLI tool (install with: cargo install uniffi-bindgen)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🦀 Generating FFI bindings for nuvio-core..."

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
else
    echo "❌ Unsupported platform: $OSTYPE"
    exit 1
fi

LIB_PATH="target/release/libnuvio_core.$LIB_EXT"

if [[ ! -f "$LIB_PATH" ]]; then
    echo "❌ Library not found at: $LIB_PATH"
    echo "   Please ensure cargo build --release succeeded"
    exit 1
fi

echo "✅ Built library: $LIB_PATH (platform: $PLATFORM)"

# Generate Kotlin bindings
echo "🔧 Generating Kotlin bindings..."
uniffi-bindgen generate \
    --library "$LIB_PATH" \
    --language kotlin \
    --out-dir bindings/kotlin

if [[ $? -eq 0 ]]; then
    echo "✅ Kotlin bindings generated in: bindings/kotlin/"
    ls -lh bindings/kotlin/*.kt 2>/dev/null || echo "   (no .kt files found)"
else
    echo "❌ Kotlin binding generation failed"
    exit 1
fi

# Generate Swift bindings
echo "🔧 Generating Swift bindings..."
uniffi-bindgen generate \
    --library "$LIB_PATH" \
    --language swift \
    --out-dir bindings/swift

if [[ $? -eq 0 ]]; then
    echo "✅ Swift bindings generated in: bindings/swift/"
    ls -lh bindings/swift/*.swift 2>/dev/null || echo "   (no .swift files found)"
else
    echo "❌ Swift binding generation failed"
    exit 1
fi

echo ""
echo "🎉 Binding generation complete!"
echo ""
echo "📝 Next steps:"
echo "   • Kotlin: Copy generated files to your Android project"
echo "   • Swift: Copy generated files to your Xcode project"
echo "   • Ensure the compiled library (.so/.dylib) is included in your app bundle"
