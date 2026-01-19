#!/bin/bash

###############################################################################
# NuvioTV Test Runner Script
#
# This script orchestrates testing across all platforms:
# - Android (Mobile + TV)
# - iOS (iPhone, iPad, Apple TV)
# - Rust SDK
#
# Usage: ./test-runner.sh [command]
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Banner
print_banner() {
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║           NuvioTV Native App Test Runner                  ║"
    echo "║         Comprehensive Testing Across All Platforms        ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
}

# Test result tracking
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

# Report test result
report_result() {
    local test_name=$1
    local exit_code=$2

    if [ $exit_code -eq 0 ]; then
        log_success "$test_name: PASSED"
        ((TESTS_PASSED++))
    else
        log_error "$test_name: FAILED (exit code: $exit_code)"
        ((TESTS_FAILED++))
    fi
}

###############################################################################
# Android Tests
###############################################################################

android_unit_tests() {
    log_info "Running Android Unit Tests..."
    cd android
    ./gradlew test --console=plain
    report_result "Android Unit Tests" $?
    cd ..
}

android_integration_tests() {
    log_info "Running Android Integration Tests..."
    log_warning "This requires an Android emulator or device to be connected"

    cd android
    ./gradlew connectedAndroidTest --console=plain
    report_result "Android Integration Tests" $?
    cd ..
}

android_ui_tests() {
    log_info "Running Android UI Tests (Compose)..."
    log_warning "Compose UI tests not yet implemented"
    ((TESTS_SKIPPED++))
}

android_lint() {
    log_info "Running Android Lint..."
    cd android
    ./gradlew lint --console=plain
    report_result "Android Lint" $?
    cd ..
}

android_all_tests() {
    log_info "Running ALL Android Tests..."
    android_unit_tests
    android_integration_tests
    android_ui_tests
    android_lint
}

###############################################################################
# iOS Tests
###############################################################################

ios_unit_tests() {
    log_info "Running iOS Unit Tests..."
    cd ios
    xcodebuild test \
        -workspace NuvioTV.xcworkspace \
        -scheme NuvioTV \
        -destination 'platform=iOS Simulator,name=iPhone 15' \
        -only-testing:NuvioTVTests \
        | xcpretty || true
    report_result "iOS Unit Tests" ${PIPESTATUS[0]}
    cd ..
}

ios_ui_tests() {
    log_info "Running iOS UI Tests..."
    cd ios
    xcodebuild test \
        -workspace NuvioTV.xcworkspace \
        -scheme NuvioTV \
        -destination 'platform=iOS Simulator,name=iPhone 15' \
        -only-testing:NuvioTVUITests \
        | xcpretty || true
    report_result "iOS UI Tests" ${PIPESTATUS[0]}
    cd ..
}

ios_tvos_tests() {
    log_info "Running iOS tvOS Tests..."
    cd ios
    xcodebuild test \
        -workspace NuvioTV.xcworkspace \
        -scheme NuvioTV \
        -destination 'platform=tvOS Simulator,name=Apple TV' \
        | xcpretty || true
    report_result "iOS tvOS Tests" ${PIPESTATUS[0]}
    cd ..
}

ios_all_tests() {
    log_info "Running ALL iOS Tests..."
    ios_unit_tests
    ios_ui_tests
    # ios_tvos_tests  # Uncomment when tvOS testing is ready
}

###############################################################################
# Rust SDK Tests
###############################################################################

rust_tests() {
    log_info "Running Rust SDK Tests..."
    cd rust-sdk
    cargo test --all-features
    report_result "Rust SDK Tests" $?
    cd ..
}

rust_clippy() {
    log_info "Running Rust Clippy (Linter)..."
    cd rust-sdk
    cargo clippy --all-targets --all-features -- -D warnings
    report_result "Rust Clippy" $?
    cd ..
}

rust_fmt_check() {
    log_info "Running Rust Format Check..."
    cd rust-sdk
    cargo fmt --check
    report_result "Rust Format Check" $?
    cd ..
}

rust_all_tests() {
    log_info "Running ALL Rust SDK Tests..."
    rust_tests
    rust_clippy
    rust_fmt_check
}

###############################################################################
# Platform-Specific Tests
###############################################################################

platform_specific_tests() {
    log_info "Running Platform-Specific Tests..."
    log_warning "Platform-specific test automation not yet implemented"
    log_info "Manual testing required for:"
    log_info "  - Android TV D-pad navigation"
    log_info "  - Apple TV remote control"
    log_info "  - iPad split view"
    log_info "  - Tablet adaptive layouts"
    ((TESTS_SKIPPED++))
}

###############################################################################
# Performance Tests
###############################################################################

performance_android() {
    log_info "Running Android Performance Tests..."
    log_warning "Android performance tests not yet automated"
    log_info "Manual profiling required using Android Studio Profiler"
    ((TESTS_SKIPPED++))
}

performance_ios() {
    log_info "Running iOS Performance Tests..."
    cd ios
    xcodebuild test \
        -workspace NuvioTV.xcworkspace \
        -scheme NuvioTV \
        -destination 'platform=iOS Simulator,name=iPhone 15' \
        -only-testing:NuvioTVTests/PerformanceTests \
        | xcpretty || true
    report_result "iOS Performance Tests" ${PIPESTATUS[0]}
    cd ..
}

performance_all() {
    log_info "Running ALL Performance Tests..."
    performance_android
    performance_ios
}

###############################################################################
# Accessibility Tests
###############################################################################

accessibility_tests() {
    log_info "Running Accessibility Tests..."
    log_warning "Accessibility tests not yet automated"
    log_info "Manual testing required for:"
    log_info "  - Android TalkBack"
    log_info "  - iOS VoiceOver"
    log_info "  - Touch target sizes"
    log_info "  - Color contrast"
    ((TESTS_SKIPPED++))
}

###############################################################################
# Integration & E2E Tests
###############################################################################

e2e_tests() {
    log_info "Running End-to-End Tests..."
    log_warning "E2E automation not yet implemented"
    log_info "Consider using:"
    log_info "  - Maestro for mobile app automation"
    log_info "  - Appium as an alternative"
    ((TESTS_SKIPPED++))
}

###############################################################################
# Coverage Reports
###############################################################################

coverage_android() {
    log_info "Generating Android Coverage Report..."
    cd android
    ./gradlew jacocoTestReport --console=plain
    report_result "Android Coverage Report" $?
    log_info "Report available at: android/app/build/reports/jacoco/jacocoTestReport/html/index.html"
    cd ..
}

coverage_ios() {
    log_info "Generating iOS Coverage Report..."
    log_warning "iOS coverage report generation not yet automated"
    log_info "Use Xcode's code coverage feature: Product → Test → Show Code Coverage"
    ((TESTS_SKIPPED++))
}

coverage_all() {
    log_info "Generating ALL Coverage Reports..."
    coverage_android
    coverage_ios
}

###############################################################################
# Comprehensive Test Suites
###############################################################################

all_tests() {
    log_info "Running COMPREHENSIVE Test Suite..."
    echo ""
    rust_all_tests
    echo ""
    android_all_tests
    echo ""
    ios_all_tests
    echo ""
    print_summary
}

quick_tests() {
    log_info "Running QUICK Test Suite (Unit Tests Only)..."
    echo ""
    rust_tests
    echo ""
    android_unit_tests
    echo ""
    ios_unit_tests
    echo ""
    print_summary
}

ci_tests() {
    log_info "Running CI Test Suite..."
    echo ""
    rust_all_tests
    echo ""
    android_unit_tests
    android_lint
    echo ""
    ios_unit_tests
    echo ""
    print_summary
}

###############################################################################
# Verification Tests
###############################################################################

verify_migration() {
    log_info "Verifying React Native to Native Migration..."

    # Check if React Native code is removed
    if [ -f "index.ts" ] || [ -f "App.tsx" ]; then
        log_error "React Native entry points still exist!"
        ((TESTS_FAILED++))
    else
        log_success "React Native code removed"
        ((TESTS_PASSED++))
    fi

    # Check Android native implementation
    if [ -f "android/app/src/main/java/com/nuvio/app/tv/MainComposeActivity.kt" ]; then
        log_success "Android native implementation present"
        ((TESTS_PASSED++))
    else
        log_error "Android native implementation missing!"
        ((TESTS_FAILED++))
    fi

    # Check iOS native implementation
    if [ -f "ios/NuvioTV/Sources/ViewModels/HomeViewModel.swift" ]; then
        log_success "iOS native implementation present"
        ((TESTS_PASSED++))
    else
        log_error "iOS native implementation missing!"
        ((TESTS_FAILED++))
    fi

    # Check Rust SDK integration
    if [ -f "rust-sdk/nuvio-core/src/lib.rs" ]; then
        log_success "Rust SDK present"
        ((TESTS_PASSED++))
    else
        log_error "Rust SDK missing!"
        ((TESTS_FAILED++))
    fi
}

verify_build() {
    log_info "Verifying Build Configuration..."

    # Verify Android build
    log_info "Building Android..."
    cd android
    ./gradlew assembleDebug --console=plain
    report_result "Android Build" $?
    cd ..

    # Verify iOS build
    log_info "Building iOS..."
    cd ios
    xcodebuild build \
        -workspace NuvioTV.xcworkspace \
        -scheme NuvioTV \
        -sdk iphonesimulator \
        -configuration Debug \
        | xcpretty || true
    report_result "iOS Build" ${PIPESTATUS[0]}
    cd ..
}

###############################################################################
# Summary & Reporting
###############################################################################

print_summary() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║                    TEST SUMMARY                            ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    log_success "Tests Passed:  $TESTS_PASSED"
    log_error "Tests Failed:  $TESTS_FAILED"
    log_warning "Tests Skipped: $TESTS_SKIPPED"
    echo ""

    TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
    if [ $TOTAL_TESTS -gt 0 ]; then
        SUCCESS_RATE=$((TESTS_PASSED * 100 / TOTAL_TESTS))
        echo "Success Rate: $SUCCESS_RATE%"
    fi
    echo ""

    if [ $TESTS_FAILED -eq 0 ]; then
        log_success "All tests passed! ✓"
        exit 0
    else
        log_error "Some tests failed! ✗"
        exit 1
    fi
}

###############################################################################
# Help
###############################################################################

show_help() {
    echo "NuvioTV Test Runner"
    echo ""
    echo "Usage: ./test-runner.sh [command]"
    echo ""
    echo "Android Tests:"
    echo "  android-unit        Run Android unit tests"
    echo "  android-integration Run Android integration tests"
    echo "  android-ui          Run Android Compose UI tests"
    echo "  android-lint        Run Android lint"
    echo "  android-all         Run all Android tests"
    echo ""
    echo "iOS Tests:"
    echo "  ios-unit            Run iOS unit tests"
    echo "  ios-ui              Run iOS UI tests"
    echo "  ios-tvos            Run tvOS tests"
    echo "  ios-all             Run all iOS tests"
    echo ""
    echo "Rust SDK Tests:"
    echo "  rust-test           Run Rust SDK tests"
    echo "  rust-clippy         Run Rust Clippy (linter)"
    echo "  rust-fmt            Run Rust format check"
    echo "  rust-all            Run all Rust SDK tests"
    echo ""
    echo "Comprehensive Tests:"
    echo "  all                 Run ALL tests (comprehensive)"
    echo "  quick               Run quick tests (unit tests only)"
    echo "  ci                  Run CI test suite"
    echo ""
    echo "Specialized Tests:"
    echo "  platform-specific   Run platform-specific tests"
    echo "  performance-android Run Android performance tests"
    echo "  performance-ios     Run iOS performance tests"
    echo "  performance-all     Run all performance tests"
    echo "  accessibility       Run accessibility tests"
    echo "  e2e                 Run end-to-end tests"
    echo ""
    echo "Coverage:"
    echo "  coverage-android    Generate Android coverage report"
    echo "  coverage-ios        Generate iOS coverage report"
    echo "  coverage-all        Generate all coverage reports"
    echo ""
    echo "Verification:"
    echo "  verify-migration    Verify React Native migration"
    echo "  verify-build        Verify builds compile"
    echo ""
    echo "Help:"
    echo "  help                Show this help message"
    echo ""
}

###############################################################################
# Main
###############################################################################

main() {
    print_banner

    # Check for command argument
    if [ $# -eq 0 ]; then
        log_error "No command specified"
        echo ""
        show_help
        exit 1
    fi

    # Execute command
    case "$1" in
        # Android
        android-unit)        android_unit_tests ;;
        android-integration) android_integration_tests ;;
        android-ui)          android_ui_tests ;;
        android-lint)        android_lint ;;
        android-all)         android_all_tests ;;

        # iOS
        ios-unit)            ios_unit_tests ;;
        ios-ui)              ios_ui_tests ;;
        ios-tvos)            ios_tvos_tests ;;
        ios-all)             ios_all_tests ;;

        # Rust SDK
        rust-test)           rust_tests ;;
        rust-clippy)         rust_clippy ;;
        rust-fmt)            rust_fmt_check ;;
        rust-all)            rust_all_tests ;;

        # Comprehensive
        all)                 all_tests ;;
        quick)               quick_tests ;;
        ci)                  ci_tests ;;

        # Specialized
        platform-specific)   platform_specific_tests ;;
        performance-android) performance_android ;;
        performance-ios)     performance_ios ;;
        performance-all)     performance_all ;;
        accessibility)       accessibility_tests ;;
        e2e)                 e2e_tests ;;

        # Coverage
        coverage-android)    coverage_android ;;
        coverage-ios)        coverage_ios ;;
        coverage-all)        coverage_all ;;

        # Verification
        verify-migration)    verify_migration; print_summary ;;
        verify-build)        verify_build; print_summary ;;

        # Help
        help)                show_help ;;

        *)
            log_error "Unknown command: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

main "$@"
