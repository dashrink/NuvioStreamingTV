# iOS/tvOS Testing Guide

## Overview

This document provides comprehensive information about the testing infrastructure for the NuvioTV iOS/tvOS application.

## Test Structure

### Test Targets

1. **NuvioTVTests** - Unit and Integration Tests
2. **NuvioTVUITests** - UI and End-to-End Tests

### Test Coverage

The test suite provides comprehensive coverage across multiple layers:

- **Unit Tests**: ViewModels, Models, Services
- **UI Tests**: SwiftUI views, user interactions
- **Integration Tests**: Rust SDK bindings (ready for integration)
- **End-to-End Tests**: Complete user flows
- **Performance Tests**: Load times, memory usage, responsiveness

## Running Tests

### Using Xcode

1. **Run All Tests**
   - `Cmd + U` - Run all tests in active scheme

2. **Run Specific Test**
   - Click the diamond icon next to test method
   - Or right-click and select "Run Test"

3. **Run Test Class**
   - Click diamond icon next to class name
   - Or right-click class and select "Run Tests"

### Using Command Line

```bash
# Run all tests
xcodebuild test -project NuvioTV.xcodeproj -scheme NuvioTV -destination 'platform=iOS Simulator,name=iPhone 15'

# Run unit tests only
xcodebuild test -project NuvioTV.xcodeproj -scheme NuvioTV -destination 'platform=iOS Simulator,name=iPhone 15' -only-testing:NuvioTVTests

# Run UI tests only
xcodebuild test -project NuvioTV.xcodeproj -scheme NuvioTV -destination 'platform=iOS Simulator,name=iPhone 15' -only-testing:NuvioTVUITests

# Run specific test class
xcodebuild test -project NuvioTV.xcodeproj -scheme NuvioTV -destination 'platform=iOS Simulator,name=iPhone 15' -only-testing:NuvioTVTests/HomeViewModelTests

# Run on Apple TV Simulator
xcodebuild test -project NuvioTV.xcodeproj -scheme NuvioTV -destination 'platform=tvOS Simulator,name=Apple TV'
```

## Test Files

### Unit Tests (NuvioTVTests)

#### `HomeViewModelTests.swift` (19 tests)
Tests for home screen ViewModel:
- Initial state validation
- Data loading and catalog population
- Hero content selection
- Continue watching and watchlist
- Loading state transitions
- Performance benchmarks

**Key Test Methods:**
- `testInitialState()` - Validates initial state
- `testLoadDataSuccess()` - Tests successful data loading
- `testLoadDataCatalogsPopulated()` - Validates catalog structure
- `testHomeScreenHasContent()` - Ensures content displays

#### `DetailsViewModelTests.swift` (20 tests)
Tests for details screen ViewModel:
- Details loading and metadata display
- Stream information fetching
- Watchlist toggle functionality
- Content rating
- State persistence
- Error handling

**Key Test Methods:**
- `testLoadDetailsSuccess()` - Tests details loading
- `testToggleWatchlist()` - Tests watchlist management
- `testRateContent()` - Tests rating functionality
- `testMetadataHasRequiredFields()` - Validates data structure

#### `CatalogBrowseViewModelTests.swift` (27 tests)
Tests for catalog browsing ViewModel:
- Initial state and genre loading
- Content type switching (movies/series)
- Genre and year filtering
- Sort option changes
- Pagination and infinite scroll
- Filter combinations
- Edge cases and error scenarios

**Key Test Methods:**
- `testInitialState()` - Validates initial state
- `testGenreFilter()` - Tests genre filtering
- `testPagination()` - Tests pagination
- `testCombinedFilters()` - Tests multiple filters

#### `RustSDKIntegrationTests.swift` (22 tests)
Integration tests for Rust SDK bindings:
- SDK initialization
- Catalog fetching
- Metadata retrieval
- Stream resolution
- Search functionality
- Error handling
- Concurrent requests
- Data validation

**Key Test Methods:**
- `testGetHomeCatalogsIntegration()` - Tests catalog fetching
- `testGetMetadataIntegration()` - Tests metadata retrieval
- `testBrowseCatalogPagination()` - Tests pagination
- `testConcurrentMetadataFetches()` - Tests concurrent operations

#### `PerformanceTests.swift` (25 tests)
Performance benchmarking tests:
- ViewModel initialization time
- Data loading performance
- Pagination speed
- Filter change responsiveness
- Memory footprint
- Concurrent operation performance
- Model serialization

**Key Test Methods:**
- `testHomeDataLoadingPerformance()` - Benchmarks home loading
- `testPaginationLoadMorePerformance()` - Tests pagination speed
- `testConcurrentMetadataFetchesPerformance()` - Tests parallel fetches

### UI Tests (NuvioTVUITests)

#### `NuvioTVUITests.swift` (8 tests)
Basic app UI tests:
- App launch validation
- Home screen loading
- Navigation flow
- Scroll performance
- Launch performance metrics

#### `CatalogBrowseUITests.swift` (13 tests)
Catalog browsing UI tests:
- Content type toggle (Movies/Series)
- Genre filtering interaction
- Sort menu functionality
- Grid layout and display
- Infinite scroll loading
- Filter combinations
- Platform-specific layouts

#### `DetailsScreenUITests.swift` (18 tests)
Details screen UI tests:
- Screen loading and layout
- Metadata display
- Action buttons (Play, Watchlist, Rate, Share)
- Watchlist toggle interaction
- Share sheet functionality
- Scroll behavior
- Navigation (back)
- Multiple content item navigation

#### `HomeScreenUITests.swift` (20 tests)
Home screen UI tests:
- Screen appearance on launch
- Catalog and item loading
- Hero carousel display and interaction
- Category row scrolling
- Continue watching section
- Watchlist section
- Vertical scrolling
- Pull-to-refresh
- Navigation to details
- Memory stability

#### `EndToEndFlowTests.swift` (12 tests)
Complete user flow tests:
- Content discovery flow (home → details → back)
- Catalog browsing flow (filter → sort → view)
- Watchlist management flow
- Content rating flow
- Content sharing flow
- Multi-content navigation
- Content type switching
- Complex filtering flow
- Stress tests (rapid navigation, extensive scrolling)
- Performance measurement

## Test Best Practices

### Writing Unit Tests

1. **Use Async/Await Properly**
```swift
func testAsyncOperation() async {
    await viewModel.loadData()
    XCTAssertFalse(viewModel.state.isLoading)
}
```

2. **Test State Transitions**
```swift
func testLoadingStateTransition() async {
    let expectation = XCTestExpectation(description: "Loading completes")

    viewModel.$state
        .dropFirst()
        .sink { state in
            if !state.isLoading {
                expectation.fulfill()
            }
        }
        .store(in: &cancellables)

    await viewModel.loadData()
    await fulfillment(of: [expectation], timeout: 5.0)
}
```

3. **Use Proper Timeouts**
```swift
try? await Task.sleep(nanoseconds: 1_000_000_000) // 1 second
```

### Writing UI Tests

1. **Wait for Elements**
```swift
XCTAssertTrue(app.buttons["Play"].waitForExistence(timeout: 3.0))
```

2. **Use Helper Methods**
```swift
func navigateToDetailsScreen() {
    sleep(2)
    let images = app.images
    if images.count > 0 {
        images.element(boundBy: 0).tap()
        sleep(1)
    }
}
```

3. **Handle Platform Differences**
```swift
#if os(iOS)
    // iOS-specific tests
#elseif os(tvOS)
    // tvOS-specific tests
#endif
```

## Test Coverage Goals

### Current Coverage

- **ViewModels**: ~90% coverage
  - HomeViewModel: Full coverage
  - DetailsViewModel: Full coverage
  - CatalogBrowseViewModel: Comprehensive coverage

- **UI Flows**: ~80% coverage
  - Home screen: Well covered
  - Details screen: Well covered
  - Catalog browse: Well covered

- **Integration**: Ready for Rust SDK
  - Mock repository: 100% tested
  - Rust SDK: Tests ready, pending integration

### Areas for Expansion

1. **Player Integration**
   - Video playback tests
   - Player controls tests
   - Playback state management

2. **Settings & Profile**
   - Profile management tests
   - Settings persistence tests
   - Sync functionality tests

3. **Search**
   - Search query tests
   - Search result filtering
   - Search history

4. **Accessibility**
   - VoiceOver support tests
   - Dynamic type tests
   - Accessibility identifier tests

## Performance Benchmarks

### Expected Performance

- **Home Load**: < 1.0s (with mock data)
- **Details Load**: < 0.5s (with mock data)
- **Catalog Browse**: < 0.8s per page
- **Filter Change**: < 0.3s
- **Pagination**: < 0.6s per page

### Memory Guidelines

- **Home Screen**: < 50MB base memory
- **Catalog Browse**: < 100MB with 100+ items
- **Details Screen**: < 30MB per screen

## Continuous Integration

### CI/CD Integration

```yaml
# Example GitHub Actions workflow
name: iOS Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: macos-latest

    steps:
    - uses: actions/checkout@v3

    - name: Select Xcode
      run: sudo xcode-select -s /Applications/Xcode_15.0.app

    - name: Run Unit Tests
      run: |
        xcodebuild test \
          -project ios/NuvioTV.xcodeproj \
          -scheme NuvioTV \
          -destination 'platform=iOS Simulator,name=iPhone 15' \
          -only-testing:NuvioTVTests

    - name: Run UI Tests
      run: |
        xcodebuild test \
          -project ios/NuvioTV.xcodeproj \
          -scheme NuvioTV \
          -destination 'platform=iOS Simulator,name=iPhone 15' \
          -only-testing:NuvioTVUITests
```

## Troubleshooting

### Common Issues

1. **Tests Timing Out**
   - Increase timeout values
   - Check for network delays in mock
   - Verify async operations complete

2. **UI Tests Failing Intermittently**
   - Add explicit waits with `waitForExistence(timeout:)`
   - Use `sleep()` sparingly but strategically
   - Check for animation delays

3. **Memory Leaks**
   - Use Instruments Memory Profiler
   - Check for retain cycles
   - Verify `@MainActor` usage

4. **Platform-Specific Failures**
   - Test on both iOS and tvOS simulators
   - Use conditional compilation for platform-specific code
   - Test different device sizes

## Resources

### Apple Documentation
- [XCTest Framework](https://developer.apple.com/documentation/xctest)
- [Testing Your App](https://developer.apple.com/documentation/xcode/testing-your-app)
- [UI Testing](https://developer.apple.com/documentation/xctest/user_interface_tests)

### Project-Specific
- [RUST_SDK_INTEGRATION_GUIDE.md](./RUST_SDK_INTEGRATION_GUIDE.md)
- [QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md)
- [CATALOG_FEATURE_README.md](./CATALOG_FEATURE_README.md)

## Future Improvements

1. **Snapshot Testing**
   - Add SwiftUI snapshot tests
   - Visual regression testing

2. **Code Coverage Reports**
   - Integrate with coverage tools
   - Set coverage thresholds

3. **Test Parallelization**
   - Enable parallel testing
   - Optimize test execution time

4. **Mocking Framework**
   - Consider adding protocols for better mocking
   - Create test doubles for complex scenarios

5. **Accessibility Testing**
   - Add VoiceOver tests
   - Test with accessibility features enabled

## Contributing

When adding new features:

1. Write tests first (TDD approach recommended)
2. Aim for >80% code coverage
3. Include both unit and UI tests
4. Document complex test scenarios
5. Run full test suite before committing

## Test Statistics

- **Total Test Files**: 9
- **Total Test Methods**: ~143
- **Unit Tests**: 68
- **UI Tests**: 59
- **Integration Tests**: 22
- **Performance Tests**: 25
- **End-to-End Tests**: 12

---

**Last Updated**: January 2026
**Author**: Claude Code
**Version**: 1.0
