#!/bin/bash
# Build script for Android Rust SDK
# This script configures the Android NDK toolchain and builds the Rust SDK for Android

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Building Rust SDK for Android ===${NC}"

# Find Android NDK
if [ -z "$ANDROID_NDK_HOME" ]; then
    if [ -d "$HOME/Android/Sdk/ndk" ]; then
        # Find the latest NDK version
        ANDROID_NDK_HOME=$(find "$HOME/Android/Sdk/ndk" -maxdepth 1 -type d | sort -V | tail -1)
        echo -e "${YELLOW}Using NDK: $ANDROID_NDK_HOME${NC}"
    else
        echo -e "${RED}Error: Android NDK not found!${NC}"
        echo "Please install Android NDK via Android Studio or set ANDROID_NDK_HOME"
        exit 1
    fi
fi

# Set up toolchain PATH
export PATH="$ANDROID_NDK_HOME/toolchains/llvm/prebuilt/linux-x86_64/bin:$PATH"

# Verify toolchain is available
if ! command -v aarch64-linux-android21-clang &> /dev/null; then
    echo -e "${RED}Error: Android NDK toolchain not found in PATH${NC}"
    echo "Expected path: $ANDROID_NDK_HOME/toolchains/llvm/prebuilt/linux-x86_64/bin"
    exit 1
fi

echo -e "${GREEN}NDK toolchain configured successfully${NC}"

# Check if Rust targets are installed
echo "Checking Rust Android targets..."
if ! rustup target list --installed | grep -q "aarch64-linux-android"; then
    echo -e "${YELLOW}Installing Android Rust targets...${NC}"
    rustup target add aarch64-linux-android armv7-linux-androideabi x86_64-linux-android i686-linux-android
fi

# Build for Android
echo -e "${GREEN}Building for Android (aarch64)...${NC}"
cargo build --release --target aarch64-linux-android

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Build successful!${NC}"
    echo "Output: target/aarch64-linux-android/release/libnuvio_core.so"

    # Copy to Android jniLibs if directory exists
    if [ -d "../android/shared/src/main/jniLibs/arm64-v8a" ]; then
        echo -e "${YELLOW}Copying library to Android project...${NC}"
        cp target/aarch64-linux-android/release/libnuvio_core.so ../android/shared/src/main/jniLibs/arm64-v8a/
        echo -e "${GREEN}✓ Library copied to Android project${NC}"
    fi
else
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi
