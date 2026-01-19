#!/bin/bash

###############################################################################
# Android Implementation Verification Script
#
# Verifies the Android native implementation is complete and functional
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[!]${NC} $1"; }

CHECKS_PASSED=0
CHECKS_FAILED=0

check() {
    local description=$1
    local condition=$2

    if eval "$condition"; then
        log_success "$description"
        ((CHECKS_PASSED++))
    else
        log_error "$description"
        ((CHECKS_FAILED++))
    fi
}

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     Android Native Implementation Verification            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

log_info "Checking project structure..."

# Architecture files
check "MainComposeActivity exists" "[ -f app/src/main/java/com/nuvio/app/tv/MainComposeActivity.kt ]"
check "MainApplication exists" "[ -f app/src/main/java/com/nuvio/app/tv/MainApplication.kt ]"

# ViewModels
log_info "Checking ViewModels..."
check "HomeViewModel exists" "[ -f app/src/main/java/com/nuvio/app/tv/ui/home/HomeViewModel.kt ]"
check "PlayerViewModel exists" "[ -f app/src/main/java/com/nuvio/app/tv/player/PlayerViewModel.kt ]"
check "DetailsViewModel exists" "[ -f app/src/main/java/com/nuvio/app/tv/ui/details/DetailsViewModel.kt ]"

# Repositories
log_info "Checking Repositories..."
check "CatalogRepository interface exists" "[ -f app/src/main/java/com/nuvio/app/tv/data/repository/CatalogRepository.kt ]"
check "RustCatalogRepository exists" "[ -f app/src/main/java/com/nuvio/app/tv/data/repository/RustCatalogRepository.kt ]"
check "PlayerRepository exists" "[ -f app/src/main/java/com/nuvio/app/tv/player/data/PlayerRepository.kt ]"

# UI Screens
log_info "Checking UI Screens..."
check "HomeScreen exists" "[ -f app/src/main/java/com/nuvio/app/tv/ui/home/HomeScreen.kt ]"
check "DetailsScreen exists" "[ -f app/src/main/java/com/nuvio/app/tv/ui/details/DetailsScreen.kt ]"
check "VideoPlayerScreen exists" "[ -f app/src/main/java/com/nuvio/app/tv/player/ui/VideoPlayerScreen.kt ]"

# Dependency Injection
log_info "Checking Dependency Injection..."
check "AppModule exists" "[ -f app/src/main/java/com/nuvio/app/tv/di/AppModule.kt ]"
check "RustModule exists" "[ -f app/src/main/java/com/nuvio/app/tv/di/RustModule.kt ]"

# Player Components
log_info "Checking Player Components..."
check "ExoPlayerHolder exists" "[ -f app/src/main/java/com/nuvio/app/tv/player/ExoPlayerHolder.kt ]"
check "TvControls exists" "[ -f app/src/main/java/com/nuvio/app/tv/player/ui/TvControls.kt ]"
check "MobileControls exists" "[ -f app/src/main/java/com/nuvio/app/tv/player/ui/MobileControls.kt ]"

# Tests
log_info "Checking Test Files..."
check "HomeViewModelTest exists" "[ -f app/src/test/java/com/nuvio/app/tv/ui/home/HomeViewModelTest.kt ]"
check "PlayerViewModelTest exists" "[ -f app/src/test/java/com/nuvio/app/tv/player/PlayerViewModelTest.kt ]"
check "DetailsViewModelTest exists" "[ -f app/src/test/java/com/nuvio/app/tv/ui/details/DetailsViewModelTest.kt ]"
check "RustCatalogRepositoryTest exists" "[ -f app/src/test/java/com/nuvio/app/tv/data/repository/RustCatalogRepositoryTest.kt ]"
check "StremioServiceIntegrationTest exists" "[ -f app/src/androidTest/java/com/nuvio/app/tv/sdk/StremioServiceIntegrationTest.kt ]"
check "ProfileManagerIntegrationTest exists" "[ -f app/src/androidTest/java/com/nuvio/app/tv/sdk/ProfileManagerIntegrationTest.kt ]"

# Build Configuration
log_info "Checking Build Configuration..."
check "Kotlin build.gradle.kts exists" "[ -f app/build.gradle.kts ]"
check "Version catalog exists" "[ -f gradle/libs.versions.toml ]"
check "Kotlin settings.gradle.kts exists" "[ -f settings.gradle.kts ]"

# React Native Removal
log_info "Checking React Native Removal..."
check "Old MainActivity.kt removed" "[ ! -f app/src/main/java/com/nuvio/app/MainActivity.kt ]"
check "Old build.gradle removed" "[ ! -f app/build.gradle ]"
check "Old settings.gradle removed" "[ ! -f settings.gradle ]"

echo ""
log_info "Running Build Verification..."

# Build check
if ./gradlew assembleDebug --console=plain > /dev/null 2>&1; then
    log_success "Android build compiles successfully"
    ((CHECKS_PASSED++))
else
    log_error "Android build FAILED"
    ((CHECKS_FAILED++))
fi

echo ""
log_info "Running Unit Tests..."

# Unit test check
if ./gradlew test --console=plain > /dev/null 2>&1; then
    log_success "Unit tests pass"
    ((CHECKS_PASSED++))
else
    log_error "Unit tests FAILED"
    ((CHECKS_FAILED++))
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                 VERIFICATION SUMMARY                       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
log_success "Checks Passed: $CHECKS_PASSED"
log_error "Checks Failed: $CHECKS_FAILED"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
    log_success "Android native implementation verified successfully! ✓"
    exit 0
else
    log_error "Android native implementation verification FAILED! ✗"
    exit 1
fi
