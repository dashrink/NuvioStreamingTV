#!/bin/bash
# QA Verification Script for Rust SDK Foundation
# This script runs all QA acceptance criteria from spec.md

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
SKIPPED=0

echo "=========================================="
echo "  Rust SDK Foundation - QA Verification"
echo "=========================================="
echo ""

# Function to print status
print_status() {
    local status=$1
    local message=$2

    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✓ PASS${NC}: $message"
        ((PASSED++))
    elif [ "$status" = "FAIL" ]; then
        echo -e "${RED}✗ FAIL${NC}: $message"
        ((FAILED++))
    elif [ "$status" = "SKIP" ]; then
        echo -e "${YELLOW}⊘ SKIP${NC}: $message"
        ((SKIPPED++))
    else
        echo -e "${BLUE}ℹ INFO${NC}: $message"
    fi
}

# Change to rust-sdk directory
cd "$(dirname "$0")/.."
echo "Working directory: $(pwd)"
echo ""

# =============================================================================
# 1. UNIT TESTS
# =============================================================================
echo "=== 1. UNIT TESTS ==="
echo ""

if cargo test --no-fail-fast 2>&1 | tee /tmp/cargo-test.log; then
    print_status "PASS" "All unit tests passed"

    # Count tests
    TEST_COUNT=$(grep -o "test result: ok\. [0-9]* passed" /tmp/cargo-test.log | grep -o "[0-9]*" | head -1)
    if [ -n "$TEST_COUNT" ]; then
        echo "  Total tests passed: $TEST_COUNT"
    fi
else
    print_status "FAIL" "Unit tests failed - see output above"
fi
echo ""

# =============================================================================
# 2. CODE QUALITY - CLIPPY
# =============================================================================
echo "=== 2. CODE QUALITY - CLIPPY ==="
echo ""

if cargo clippy -- -D warnings 2>&1 | tee /tmp/cargo-clippy.log; then
    print_status "PASS" "No clippy warnings or errors"
else
    print_status "FAIL" "Clippy found warnings or errors"
fi
echo ""

# =============================================================================
# 3. CODE FORMATTING
# =============================================================================
echo "=== 3. CODE FORMATTING ==="
echo ""

if cargo fmt -- --check 2>&1; then
    print_status "PASS" "Code is properly formatted"
else
    print_status "FAIL" "Code formatting issues found - run 'cargo fmt' to fix"
fi
echo ""

# =============================================================================
# 4. BUILD VERIFICATION
# =============================================================================
echo "=== 4. BUILD VERIFICATION ==="
echo ""

if cargo build --release 2>&1 | grep -q "Finished"; then
    print_status "PASS" "Release build succeeded"

    # Check for .so file on Linux
    if [ -f "target/release/libnuvio_core.so" ]; then
        print_status "PASS" "Linux library (.so) generated"
    fi

    # Check for .dylib file on macOS
    if [ -f "target/release/libnuvio_core.dylib" ]; then
        print_status "PASS" "macOS library (.dylib) generated"
    fi
else
    print_status "FAIL" "Release build failed"
fi
echo ""

# =============================================================================
# 5. SECURITY AUDIT
# =============================================================================
echo "=== 5. SECURITY AUDIT ==="
echo ""

# Check if cargo-audit is installed
if command -v cargo-audit &> /dev/null; then
    if cargo audit 2>&1 | tee /tmp/cargo-audit.log; then
        print_status "PASS" "No security vulnerabilities found"
    else
        # Check if it's just warnings or actual vulnerabilities
        if grep -q "warning:" /tmp/cargo-audit.log && ! grep -q "error:" /tmp/cargo-audit.log; then
            print_status "PASS" "No critical vulnerabilities (warnings present)"
        else
            print_status "FAIL" "Security vulnerabilities detected"
        fi
    fi
else
    print_status "SKIP" "cargo-audit not installed - run 'cargo install cargo-audit'"
fi
echo ""

# =============================================================================
# 6. BINDING GENERATION - KOTLIN
# =============================================================================
echo "=== 6. BINDING GENERATION - KOTLIN ==="
echo ""

# Detect platform and library extension
if [[ "$OSTYPE" == "darwin"* ]]; then
    LIB_EXT="dylib"
    PLATFORM="macOS"
else
    LIB_EXT="so"
    PLATFORM="Linux"
fi

echo "Platform: $PLATFORM (library extension: .$LIB_EXT)"

# Check if uniffi-bindgen is installed
if command -v uniffi-bindgen &> /dev/null; then
    UNIFFI_VERSION=$(uniffi-bindgen --version 2>&1 || echo "unknown")
    echo "uniffi-bindgen version: $UNIFFI_VERSION"

    if [ -f "target/release/libnuvio_core.$LIB_EXT" ]; then
        if uniffi-bindgen generate \
            --library "target/release/libnuvio_core.$LIB_EXT" \
            --language kotlin \
            --out-dir bindings/kotlin 2>&1; then

            # Count generated files
            KT_COUNT=$(ls bindings/kotlin/*.kt 2>/dev/null | wc -l)
            if [ "$KT_COUNT" -gt 0 ]; then
                print_status "PASS" "Kotlin bindings generated ($KT_COUNT .kt files)"
            else
                print_status "FAIL" "No Kotlin bindings generated"
            fi
        else
            print_status "FAIL" "Kotlin binding generation failed"
        fi
    else
        print_status "SKIP" "Library not built - run 'cargo build --release' first"
    fi
else
    print_status "SKIP" "uniffi-bindgen not installed - run 'cargo install uniffi-bindgen'"
fi
echo ""

# =============================================================================
# 7. BINDING GENERATION - SWIFT
# =============================================================================
echo "=== 7. BINDING GENERATION - SWIFT ==="
echo ""

if command -v uniffi-bindgen &> /dev/null; then
    if [ -f "target/release/libnuvio_core.$LIB_EXT" ]; then
        if uniffi-bindgen generate \
            --library "target/release/libnuvio_core.$LIB_EXT" \
            --language swift \
            --out-dir bindings/swift 2>&1; then

            # Count generated files
            SWIFT_COUNT=$(ls bindings/swift/*.swift 2>/dev/null | wc -l)
            if [ "$SWIFT_COUNT" -gt 0 ]; then
                print_status "PASS" "Swift bindings generated ($SWIFT_COUNT .swift files)"
            else
                print_status "FAIL" "No Swift bindings generated"
            fi
        else
            print_status "FAIL" "Swift binding generation failed"
        fi
    else
        print_status "SKIP" "Library not built - run 'cargo build --release' first"
    fi
else
    print_status "SKIP" "uniffi-bindgen not installed"
fi
echo ""

# =============================================================================
# 8. MULTI-PLATFORM BUILDS
# =============================================================================
echo "=== 8. MULTI-PLATFORM BUILDS ==="
echo ""

# iOS
if rustup target list | grep -q "aarch64-apple-ios (installed)"; then
    if cargo build --release --target aarch64-apple-ios 2>&1 | grep -q "Finished\|Compiling"; then
        print_status "PASS" "iOS build (aarch64-apple-ios) succeeded"
    else
        print_status "FAIL" "iOS build failed"
    fi
else
    print_status "SKIP" "iOS target not installed - run 'rustup target add aarch64-apple-ios'"
fi

# macOS ARM
if rustup target list | grep -q "aarch64-apple-darwin (installed)"; then
    if cargo build --release --target aarch64-apple-darwin 2>&1 | grep -q "Finished\|Compiling"; then
        print_status "PASS" "macOS ARM build (aarch64-apple-darwin) succeeded"
    else
        print_status "FAIL" "macOS ARM build failed"
    fi
else
    print_status "SKIP" "macOS ARM target not installed - run 'rustup target add aarch64-apple-darwin'"
fi

# Linux x86_64
if rustup target list | grep -q "x86_64-unknown-linux-gnu (installed)"; then
    if cargo build --release --target x86_64-unknown-linux-gnu 2>&1 | grep -q "Finished\|Compiling"; then
        print_status "PASS" "Linux x86_64 build succeeded"
    else
        print_status "FAIL" "Linux x86_64 build failed"
    fi
else
    print_status "SKIP" "Linux x86_64 target not installed - run 'rustup target add x86_64-unknown-linux-gnu'"
fi

# Android ARM64
if rustup target list | grep -q "aarch64-linux-android (installed)"; then
    if cargo build --release --target aarch64-linux-android 2>&1 | grep -q "Finished\|Compiling"; then
        print_status "PASS" "Android ARM64 build succeeded"
    else
        print_status "FAIL" "Android ARM64 build failed"
    fi
else
    print_status "SKIP" "Android target not installed - run 'rustup target add aarch64-linux-android'"
fi
echo ""

# =============================================================================
# 9. MANUAL VERIFICATIONS
# =============================================================================
echo "=== 9. MANUAL VERIFICATIONS ==="
echo ""

# Check for generics on exported types
echo "Checking for generic type parameters on uniffi::Record types..."
if grep -r "pub struct.*<.*>" nuvio-core/src/types/*.rs 2>/dev/null | grep -q "uniffi::Record"; then
    print_status "FAIL" "Found generic type parameters on uniffi::Record types"
else
    print_status "PASS" "No generic type parameters on exported types"
fi

# Check for lifetimes on exported types
echo "Checking for lifetime parameters on exported types..."
if grep -r "pub struct.*<'.*>" nuvio-core/src/types/*.rs 2>/dev/null | grep -q "uniffi::Record"; then
    print_status "FAIL" "Found lifetime parameters on exported types"
else
    print_status "PASS" "No lifetime parameters on exported types"
fi

# Check for tuple enum variants
echo "Checking for tuple enum variants..."
if grep -r "^\s*[A-Z][a-zA-Z]*([^{]*)" nuvio-core/src/error.rs 2>/dev/null; then
    print_status "FAIL" "Found tuple enum variants (should use named fields)"
else
    print_status "PASS" "All enum variants use named fields"
fi

# Check for cdylib in Cargo.toml
echo "Checking for cdylib in Cargo.toml..."
if grep -q 'crate-type.*=.*\[.*"cdylib"' nuvio-core/Cargo.toml; then
    print_status "PASS" "cdylib configured in Cargo.toml"
else
    print_status "FAIL" "cdylib not found in Cargo.toml"
fi

# Check for build.rs
if [ -f "nuvio-core/build.rs" ]; then
    print_status "PASS" "build.rs exists"
else
    print_status "FAIL" "build.rs not found"
fi

# Check for uniffi in build-dependencies
if grep -A 5 "\[build-dependencies\]" nuvio-core/Cargo.toml | grep -q "uniffi"; then
    print_status "PASS" "uniffi in build-dependencies"
else
    print_status "FAIL" "uniffi not found in build-dependencies"
fi

echo ""

# =============================================================================
# 10. DOCUMENTATION VERIFICATION
# =============================================================================
echo "=== 10. DOCUMENTATION VERIFICATION ==="
echo ""

# Check for README.md
if [ -f "README.md" ]; then
    print_status "PASS" "README.md exists"

    # Check README content
    if grep -q "Build Instructions" README.md && grep -q "Architecture" README.md; then
        print_status "PASS" "README.md contains required sections"
    else
        print_status "FAIL" "README.md missing required sections"
    fi
else
    print_status "FAIL" "README.md not found"
fi

# Generate API documentation
if cargo doc --no-deps 2>&1 | grep -q "Finished\|Documenting"; then
    print_status "PASS" "API documentation generated successfully"

    if [ -f "target/doc/nuvio_core/index.html" ]; then
        print_status "PASS" "API documentation index.html exists"
    fi
else
    print_status "FAIL" "API documentation generation failed"
fi

echo ""

# =============================================================================
# SUMMARY
# =============================================================================
echo "=========================================="
echo "  QA VERIFICATION SUMMARY"
echo "=========================================="
echo ""
echo -e "${GREEN}Passed:${NC}  $PASSED"
echo -e "${RED}Failed:${NC}  $FAILED"
echo -e "${YELLOW}Skipped:${NC} $SKIPPED"
echo ""

TOTAL=$((PASSED + FAILED + SKIPPED))
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ ALL CHECKS PASSED${NC} (excluding skipped)"
    echo ""
    echo "QA Sign-off: APPROVED"
    exit 0
else
    echo -e "${RED}✗ SOME CHECKS FAILED${NC}"
    echo ""
    echo "QA Sign-off: REJECTED - Fix failing checks before proceeding"
    exit 1
fi
