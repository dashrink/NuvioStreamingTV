# Android Testing Guide

## Overview

This document describes the testing infrastructure and best practices for the Nuvio Android application.

## Test Structure

```
android/app/src/
├── test/                      # Unit tests (JVM)
│   └── java/com/nuvio/app/tv/
│       ├── ui/               # ViewModel tests
│       │   ├── home/
│       │   ├── player/
│       │   ├── details/
│       │   ├── discovery/
│       │   ├── catalog/
│       │   └── profile/
│       ├── data/repository/  # Repository tests
│       └── util/            # Test utilities
└── androidTest/              # Instrumentation tests (Android)
    └── java/com/nuvio/app/tv/
        ├── sdk/             # Rust SDK integration tests
        ├── ui/              # Compose UI tests
        └── data/repository/ # Repository integration tests
```

## Test Categories

### 1. Unit Tests

Unit tests run on the JVM and test individual components in isolation using mocks.

**Frameworks:**
- JUnit 4
- MockK for mocking
- Turbine for Flow testing
- Coroutines Test for testing suspend functions

**Coverage Target:** 80%+

**Key Tests:**
- ViewModels: State management, error handling, repository interaction
- Repositories: Data transformation, caching, error mapping
- Utilities: Helper functions, data processing

**Example:**
```kotlin
@ExperimentalCoroutinesApi
class HomeViewModelTest {
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun `loadHomeData success populates catalogs`() = runTest {
        // Given
        val catalogs = listOf(TestFixtures.sampleCatalog1)
        coEvery { catalogRepository.getHomeCatalogs() } returns Result.success(catalogs)

        // When
        viewModel.loadHomeData()

        // Then
        viewModel.uiState.test {
            val state = awaitItem()
            assertEquals(1, state.catalogs.size)
        }
    }
}
```

### 2. Integration Tests

Integration tests run on Android devices/emulators and test interactions with the Rust SDK.

**Frameworks:**
- AndroidX Test
- JUnit 4
- AndroidJUnitRunner

**Coverage Target:** All critical Rust SDK interactions

**Key Tests:**
- StremioService: Addon discovery, catalog fetching, metadata aggregation
- ProfileManager: CRUD operations, watch history, PIN management
- Memory management: UniFFI bindings lifecycle
- Concurrency: Thread safety of Rust SDK calls

**Example:**
```kotlin
@RunWith(AndroidJUnit4::class)
class ProfileManagerIntegrationTest {
    @Test
    fun testCreateProfile() {
        val profile = profileManager.createProfile(
            CreateProfileInput(name = "Test", avatar = null, type = ProfileType.STANDARD)
        )
        assertNotNull(profile)
        assertEquals("Test", profile.name)
    }
}
```

### 3. UI Tests (Compose)

UI tests verify Composable rendering and user interactions.

**Frameworks:**
- Compose UI Test
- AndroidX Test
- Espresso

**Coverage Target:** 60%+ (critical user flows)

**Key Tests:**
- Screen rendering with different states (loading, success, error)
- User interactions (clicks, scrolls, text input)
- Navigation flows
- State hoisting verification

### 4. End-to-End Tests

E2E tests verify complete user flows across multiple screens.

**Key Flows:**
- Content playback: Home → Details → Player
- Search: Discovery → Search Results → Details
- Profile sync: Profile Switch → Watch History Update
- Catalog browsing: Browse → Filter → Pagination

## Running Tests

### Run All Unit Tests
```bash
cd android
./gradlew test
```

### Run Specific Test Class
```bash
./gradlew test --tests com.nuvio.app.tv.ui.home.HomeViewModelTest
```

### Run All Integration Tests
```bash
./gradlew connectedAndroidTest
```

### Run Specific Integration Test
```bash
./gradlew connectedAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.nuvio.app.tv.sdk.ProfileManagerIntegrationTest
```

### Generate Test Coverage Report
```bash
./gradlew jacocoTestReport
# Report at: app/build/reports/jacoco/jacocoTestReport/html/index.html
```

## Test Fixtures

Shared test data is available in `TestFixtures.kt`:

```kotlin
// Sample data
TestFixtures.sampleMovie1
TestFixtures.sampleCatalog1
TestFixtures.sampleStream1

// Factory methods
TestFixtures.createMeta(id = "custom-id", name = "Custom Name")
TestFixtures.createCatalog(id = "catalog-1")
```

## Testing Best Practices

### 1. Test Organization
- **Arrange-Act-Assert (AAA)** pattern
- Clear test names describing scenario and expected outcome
- One assertion per test when possible

### 2. Mocking Strategy
- Mock external dependencies (repositories, services)
- Use real implementations for simple value objects
- Avoid mocking ViewModels in UI tests

### 3. Coroutine Testing
- Always use `MainDispatcherRule` in ViewModel tests
- Use `runTest` for coroutine-based tests
- Use `advanceTimeBy()` for time-dependent operations

### 4. Flow Testing
- Use Turbine's `test {}` block for Flow assertions
- Test initial state, loading state, and success/error states
- Verify state transitions with `awaitItem()`

### 5. Integration Test Guidelines
- Clean up resources in `@After` methods
- Handle network failures gracefully (use try-catch)
- Test memory management (create/destroy cycles)
- Verify thread safety with concurrent operations

### 6. UI Test Guidelines
- Use semantic test tags for composables
- Test with real data when possible
- Verify accessibility features
- Test on different screen sizes (phone, tablet, TV)

## Common Issues

### Issue: `UninitializedPropertyAccessException` in tests
**Solution:** Ensure `@Before` method is called. Check lateinit var initialization.

### Issue: Coroutine tests hanging
**Solution:** Verify `MainDispatcherRule` is applied and `runTest` is used.

### Issue: Flow tests not receiving emissions
**Solution:** Ensure StateFlow has initial value. Use `awaitItem()` to consume emissions.

### Issue: Integration tests failing on CI
**Solution:** Check emulator API level matches minSdk. Verify Rust SDK native libraries are included.

## Continuous Integration

Tests run automatically on:
- Every pull request
- Main branch commits
- Release builds

**CI Configuration:**
```yaml
- name: Run Unit Tests
  run: ./gradlew test

- name: Run Integration Tests
  run: ./gradlew connectedAndroidTest

- name: Upload Test Results
  uses: actions/upload-artifact@v3
  with:
    name: test-results
    path: app/build/test-results/
```

## Test Maintenance

- Update tests when modifying ViewModels or Repositories
- Add tests for new features before implementation (TDD)
- Review test coverage weekly
- Refactor tests when they become brittle
- Keep TestFixtures synchronized with production models

## Resources

- [Android Testing Guide](https://developer.android.com/training/testing)
- [Compose Testing](https://developer.android.com/jetpack/compose/testing)
- [MockK Documentation](https://mockk.io/)
- [Turbine (Flow Testing)](https://github.com/cashapp/turbine)
- [Coroutines Testing](https://kotlin.github.io/kotlinx.coroutines/kotlinx-coroutines-test/)

## Contact

For testing questions or issues, contact the Android team or create an issue in the repository.
