#!/bin/bash
# Script to verify API documentation for Nuvio Core SDK

set -e

echo "🔍 Verifying API Documentation for Nuvio Core SDK"
echo "================================================"
echo ""

# Navigate to rust-sdk directory
cd "$(dirname "$0")/.."

echo "✓ Current directory: $(pwd)"
echo ""

# Check that all source files exist
echo "📁 Checking source files..."
FILES=(
    "src/lib.rs"
    "src/types/mod.rs"
    "src/types/meta.rs"
    "src/types/stream.rs"
    "src/types/catalog.rs"
    "src/types/profile.rs"
    "src/error.rs"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✓ $file exists"
    else
        echo "  ✗ $file missing"
        exit 1
    fi
done
echo ""

# Check for proper doc comment syntax in key files
echo "📝 Checking documentation comments..."

# Check lib.rs has crate-level docs (//!)
if grep -q "^//!" src/lib.rs; then
    echo "  ✓ src/lib.rs has crate-level documentation (//!)"
else
    echo "  ✗ src/lib.rs missing crate-level documentation (//!)"
    exit 1
fi

# Check types/mod.rs has module-level docs (//!)
if grep -q "^//!" src/types/mod.rs; then
    echo "  ✓ src/types/mod.rs has module-level documentation (//!)"
else
    echo "  ✗ src/types/mod.rs missing module-level documentation (//!)"
    exit 1
fi

# Check each type file has module-level docs (//!)
for type_file in meta stream catalog profile; do
    if grep -q "^//!" "src/types/${type_file}.rs"; then
        echo "  ✓ src/types/${type_file}.rs has module-level documentation (//!)"
    else
        echo "  ✗ src/types/${type_file}.rs missing module-level documentation (//!)"
        exit 1
    fi
done

# Check error.rs has module-level docs (//!)
if grep -q "^//!" src/error.rs; then
    echo "  ✓ src/error.rs has module-level documentation (//!)"
else
    echo "  ✗ src/error.rs missing module-level documentation (//!)"
    exit 1
fi

echo ""

# Check for type-level documentation (///)
echo "📋 Checking type-level documentation..."

check_type_docs() {
    local file=$1
    local type_name=$2

    if grep -B1 "^pub struct $type_name" "$file" | grep -q "^///"; then
        echo "  ✓ $type_name has type documentation (///)"
        return 0
    elif grep -B1 "^pub enum $type_name" "$file" | grep -q "^///"; then
        echo "  ✓ $type_name has type documentation (///)"
        return 0
    else
        echo "  ✗ $type_name missing type documentation (///)"
        return 1
    fi
}

check_type_docs "src/types/meta.rs" "Meta"
check_type_docs "src/types/stream.rs" "Stream"
check_type_docs "src/types/catalog.rs" "Catalog"
check_type_docs "src/types/profile.rs" "Profile"
check_type_docs "src/error.rs" "NuvioError"

echo ""

# Generate documentation
echo "🔨 Generating API documentation..."
if cargo doc --no-deps 2>&1; then
    echo "  ✓ Documentation generated successfully"
else
    echo "  ✗ Documentation generation failed"
    exit 1
fi

echo ""

# Verify output file exists
echo "📄 Verifying output files..."
if [ -f "target/doc/nuvio_core/index.html" ]; then
    echo "  ✓ target/doc/nuvio_core/index.html exists"
else
    echo "  ✗ target/doc/nuvio_core/index.html not found"
    exit 1
fi

# Check for other expected documentation files
DOC_FILES=(
    "target/doc/nuvio_core/types/index.html"
    "target/doc/nuvio_core/types/struct.Meta.html"
    "target/doc/nuvio_core/types/struct.Stream.html"
    "target/doc/nuvio_core/types/struct.Catalog.html"
    "target/doc/nuvio_core/types/struct.Profile.html"
    "target/doc/nuvio_core/error/index.html"
    "target/doc/nuvio_core/error/enum.NuvioError.html"
)

for doc_file in "${DOC_FILES[@]}"; do
    if [ -f "$doc_file" ]; then
        echo "  ✓ $doc_file exists"
    else
        echo "  ⚠ $doc_file not found (expected but may vary)"
    fi
done

echo ""

# Check for documentation warnings
echo "⚠️  Checking for documentation warnings..."
if cargo doc --no-deps 2>&1 | grep -i warning; then
    echo "  ⚠ Documentation has warnings (see above)"
else
    echo "  ✓ No documentation warnings"
fi

echo ""
echo "================================================"
echo "✅ API Documentation Verification Complete!"
echo ""
echo "To view the documentation, run:"
echo "  cargo doc --no-deps --open"
echo ""
echo "Or open directly:"
echo "  open target/doc/nuvio_core/index.html"
echo ""
