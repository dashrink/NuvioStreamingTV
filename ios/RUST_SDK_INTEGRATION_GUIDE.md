# iOS Rust SDK Integration Guide

## Overview

This guide explains how to integrate the Rust SDK with the iOS catalog browsing feature. The current implementation uses a `MockCatalogRepository` for testing. This guide will help you replace it with a real Rust SDK implementation.

## Prerequisites

1. Rust SDK compiled for iOS/tvOS targets:
   - `aarch64-apple-ios` (iOS devices)
   - `aarch64-apple-tvos` (tvOS devices)
   - `x86_64-apple-ios-sim` (iOS Simulator)
   - `aarch64-apple-ios-sim` (iOS Simulator on Apple Silicon)

2. UniFFI-generated Swift bindings in `rust-sdk/bindings/swift/`

3. Xcode project configured to link Rust static libraries

## Step 1: Add Rust SDK to Xcode Project

### 1.1 Add Static Libraries

In Xcode project settings:

1. Go to **Build Phases** → **Link Binary With Libraries**
2. Add the following libraries:
   - `libnuvio_sdk.a` (from Rust SDK build)
   - `libresolv.tbd` (required for DNS resolution)
   - `libSystem.tbd` (system libraries)

### 1.2 Add Swift Bindings

1. Drag the UniFFI-generated Swift files into your Xcode project:
   - `rust-sdk/bindings/swift/NuvioSDK.swift`
   - Any other generated Swift files

2. Ensure they're added to your app target

### 1.3 Configure Build Settings

Add the following to **Build Settings**:

**Library Search Paths:**
```
$(PROJECT_DIR)/../rust-sdk/target/aarch64-apple-ios/release
$(PROJECT_DIR)/../rust-sdk/target/x86_64-apple-ios/release
```

**Header Search Paths:**
```
$(PROJECT_DIR)/../rust-sdk/bindings/swift
```

**Other Linker Flags:**
```
-lnuvio_sdk
```

## Step 2: Create RustCatalogRepository

Create a new file: `ios/NuvioTV/Sources/Data/Repository/RustCatalogRepository.swift`

```swift
//
//  RustCatalogRepository.swift
//  NuvioTV
//
//  Rust SDK implementation of CatalogRepository
//

import Foundation

/// Catalog repository using Rust SDK
class RustCatalogRepository: CatalogRepository {

    // MARK: - Dependencies

    private let service: StremioService
    private var metaCache: [String: StremioMeta] = [:]

    // Cinemeta addon (default for metadata)
    private let cinemetaUrl = "https://v3-cinemeta.strem.io/manifest.json"
    private let cinemetaId = "com.linvo.cinemeta"

    // MARK: - Initialization

    init(service: StremioService) {
        self.service = service
    }

    // MARK: - Private Helpers

    private func ensureCinemeta() async throws {
        let addons = try await service.getAddons()
        if !addons.contains(where: { $0.id == cinemetaId }) {
            try await service.discover(cinemetaUrl)
        }
    }

    private func mapToMeta(_ stremioMeta: StremioMeta) -> Meta {
        Meta(
            id: stremioMeta.id,
            name: stremioMeta.name,
            description: stremioMeta.description,
            posterUrl: stremioMeta.poster,
            backgroundUrl: stremioMeta.background,
            logoUrl: stremioMeta.logo,
            imdbId: stremioMeta.imdbId,
            tmdbId: nil, // Extract from behaviorHints if needed
            type: stremioMeta.contentType,
            year: stremioMeta.year.flatMap { Int($0) },
            genres: stremioMeta.genres,
            rating: stremioMeta.imdbRating.flatMap { Double($0) },
            releaseInfo: stremioMeta.releaseInfo,
            runtime: stremioMeta.runtime,
            cast: stremioMeta.cast,
            director: stremioMeta.director,
            writer: stremioMeta.writer,
            certification: stremioMeta.certification,
            country: stremioMeta.country,
            released: stremioMeta.released
        )
    }

    private func cacheMetas(_ metas: [StremioMeta]) {
        metas.forEach { metaCache[$0.id] = $0 }
    }

    // MARK: - CatalogRepository Implementation

    func getHomeCatalogs() async throws -> [Catalog] {
        try await ensureCinemeta()

        // Trending Movies
        let trendingMovies = try await service.getCatalog(
            addonId: cinemetaId,
            contentType: "movie",
            catalogId: "top",
            page: 1,
            query: nil
        )
        cacheMetas(trendingMovies)

        // Trending Series
        let trendingSeries = try await service.getCatalog(
            addonId: cinemetaId,
            contentType: "series",
            catalogId: "top",
            page: 1,
            query: nil
        )
        cacheMetas(trendingSeries)

        return [
            Catalog(
                id: "trending_movies",
                name: "Trending Movies",
                description: "Popular movies right now",
                itemIds: trendingMovies.map { $0.id }
            ),
            Catalog(
                id: "trending_series",
                name: "Trending Series",
                description: "Popular series right now",
                itemIds: trendingSeries.map { $0.id }
            )
        ]
    }

    func getMetadata(id: String) async throws -> Meta {
        // Check cache first
        if let cached = metaCache[id] {
            return mapToMeta(cached)
        }

        try await ensureCinemeta()

        // Try movie first, then series
        var meta = try? await service.aggregateMeta(contentType: "movie", contentId: id)
        if meta == nil {
            meta = try? await service.aggregateMeta(contentType: "series", contentId: id)
        }

        guard let stremioMeta = meta else {
            throw NSError(domain: "CatalogRepository", code: 404, userInfo: [
                NSLocalizedDescriptionKey: "Metadata not found for id: \(id)"
            ])
        }

        metaCache[id] = stremioMeta
        return mapToMeta(stremioMeta)
    }

    func getStreams(id: String, type: String) async throws -> [Stream] {
        let stremioStreams = try await service.resolveStreams(contentType: type, id: id)

        return stremioStreams.map { stream in
            Stream(
                url: stream.url,
                name: stream.name ?? stream.title,
                description: stream.description,
                addonName: stream.addonName
            )
        }
    }

    func search(query: String) async throws -> [Meta] {
        guard !query.isEmpty else { return [] }

        try await ensureCinemeta()

        // Search movies and series
        let movieResults = (try? await service.getCatalog(
            addonId: cinemetaId,
            contentType: "movie",
            catalogId: "top",
            page: 1,
            query: query
        )) ?? []

        let seriesResults = (try? await service.getCatalog(
            addonId: cinemetaId,
            contentType: "series",
            catalogId: "top",
            page: 1,
            query: query
        )) ?? []

        let allResults = movieResults + seriesResults
        cacheMetas(allResults)

        return allResults.map { mapToMeta($0) }
    }

    func browseCatalog(
        contentType: String,
        catalogId: String,
        page: Int,
        genre: String?,
        year: Int?,
        sort: String?
    ) async throws -> CatalogPage {
        try await ensureCinemeta()

        // Build catalog ID with genre if specified
        let fullCatalogId = genre != nil ? "genre.\(genre!)" : catalogId

        // Get catalog from service (page is 1-indexed)
        let metas = try await service.getCatalog(
            addonId: cinemetaId,
            contentType: contentType,
            catalogId: fullCatalogId,
            page: UInt(page),
            query: nil
        )

        // Cache the metas
        cacheMetas(metas)

        // Filter by year if specified
        let filteredMetas = year != nil
            ? metas.filter { $0.year == String(year!) }
            : metas

        // Map to Meta objects
        let items = filteredMetas.map { mapToMeta($0) }

        // Stremio typically returns 20 items per page
        // If we got fewer than 20, there are no more pages
        let hasMore = metas.count >= 20

        return CatalogPage(items: items, hasMore: hasMore, page: page)
    }

    func getGenres(contentType: String) async throws -> [String] {
        // Standard genres supported by Cinemeta
        return [
            "action", "adventure", "animation", "biography", "comedy",
            "crime", "documentary", "drama", "family", "fantasy",
            "film-noir", "history", "horror", "music", "musical",
            "mystery", "romance", "sci-fi", "sport", "thriller",
            "war", "western"
        ]
    }
}
```

## Step 3: Update Dependency Injection

### 3.1 Create App-Level Dependency Container

Create `ios/NuvioTV/Sources/DI/AppContainer.swift`:

```swift
//
//  AppContainer.swift
//  NuvioTV
//
//  Dependency injection container
//

import Foundation

/// App-level dependency container
class AppContainer {
    static let shared = AppContainer()

    // MARK: - Rust SDK Services

    private(set) lazy var stremioService: StremioService = {
        // Initialize Rust SDK StremioService
        // Configuration will depend on your Rust SDK API
        return StremioService()
    }()

    private(set) lazy var profileManager: ProfileManager = {
        // Initialize Rust SDK ProfileManager
        return ProfileManager()
    }()

    // MARK: - Repositories

    private(set) lazy var catalogRepository: CatalogRepository = {
        #if DEBUG
        // Use mock in debug builds for faster testing
        if ProcessInfo.processInfo.environment["USE_MOCK"] == "1" {
            return MockCatalogRepository()
        }
        #endif

        // Use Rust SDK in production
        return RustCatalogRepository(service: stremioService)
    }()

    // Prevent direct initialization
    private init() {}
}
```

### 3.2 Update NuvioTVApp.swift

```swift
//
//  NuvioTVApp.swift
//  NuvioTV
//

import SwiftUI

@main
struct NuvioTVApp: App {
    // App container for dependency injection
    private let container = AppContainer.shared

    var body: some Scene {
        WindowGroup {
            ContentView(container: container)
        }
    }
}

struct ContentView: View {
    let container: AppContainer

    var body: some View {
        CatalogBrowseView(repository: container.catalogRepository) { contentId in
            print("Content clicked: \(contentId)")
            // Navigate to details screen
        }
    }
}
```

## Step 4: Configure Rust SDK Build

### 4.1 Build Rust SDK for iOS/tvOS

In your Rust SDK directory:

```bash
# Install iOS targets
rustup target add aarch64-apple-ios
rustup target add x86_64-apple-ios
rustup target add aarch64-apple-ios-sim
rustup target add aarch64-apple-tvos

# Build for iOS device
cargo build --release --target aarch64-apple-ios

# Build for iOS Simulator (Intel)
cargo build --release --target x86_64-apple-ios

# Build for iOS Simulator (Apple Silicon)
cargo build --release --target aarch64-apple-ios-sim

# Build for tvOS device
cargo build --release --target aarch64-apple-tvos
```

### 4.2 Create Universal Binary (Optional)

Use `lipo` to create a universal binary for simulators:

```bash
lipo -create \
  target/x86_64-apple-ios/release/libnuvio_sdk.a \
  target/aarch64-apple-ios-sim/release/libnuvio_sdk.a \
  -output target/ios-sim-universal/libnuvio_sdk.a
```

## Step 5: Generate Swift Bindings with UniFFI

### 5.1 Update Rust SDK Cargo.toml

Ensure UniFFI is configured:

```toml
[lib]
crate-type = ["staticlib", "cdylib"]

[dependencies]
uniffi = "0.25"

[build-dependencies]
uniffi = { version = "0.25", features = ["build"] }
```

### 5.2 Generate Bindings

```bash
cd rust-sdk
cargo run --features uniffi/cli --bin uniffi-bindgen generate \
  src/nuvio.udl \
  --language swift \
  --out-dir bindings/swift
```

This generates:
- `NuvioSDK.swift` - Swift API
- `NuvioSDKFFI.h` - C header
- `NuvioSDKFFI.modulemap` - Module map

## Step 6: Test Integration

### 6.1 Environment Variables for Testing

Add to your Xcode scheme:

1. Edit Scheme → Run → Arguments → Environment Variables
2. Add: `USE_MOCK = 1` (to use mock repository during development)
3. Remove or set to `0` to use real Rust SDK

### 6.2 Unit Tests

Update tests to use real repository:

```swift
func testRustSDKIntegration() async throws {
    let service = StremioService()
    let repository = RustCatalogRepository(service: service)

    let catalogs = try await repository.getHomeCatalogs()
    XCTAssertFalse(catalogs.isEmpty, "Should have catalogs")
}
```

## Step 7: Error Handling

### 7.1 Rust Error Mapping

Map Rust SDK errors to Swift errors:

```swift
enum CatalogError: LocalizedError {
    case networkError(String)
    case parseError(String)
    case notFound(String)
    case sdkError(String)

    var errorDescription: String? {
        switch self {
        case .networkError(let msg): return "Network error: \(msg)"
        case .parseError(let msg): return "Parse error: \(msg)"
        case .notFound(let msg): return "Not found: \(msg)"
        case .sdkError(let msg): return "SDK error: \(msg)"
        }
    }
}
```

### 7.2 Handle Rust Exceptions

```swift
func browseCatalog(...) async throws -> CatalogPage {
    do {
        let metas = try await service.getCatalog(...)
        // Process results
    } catch let error as RustSDKError {
        // Map Rust error to Swift error
        throw CatalogError.sdkError(error.message)
    } catch {
        throw CatalogError.networkError(error.localizedDescription)
    }
}
```

## Step 8: Performance Optimization

### 8.1 Caching Strategy

```swift
// In-memory cache
private var metaCache: [String: StremioMeta] = [:]
private var cacheExpiry: [String: Date] = [:]
private let cacheTimeout: TimeInterval = 3600 // 1 hour

private func getCachedMeta(id: String) -> StremioMeta? {
    guard let expiry = cacheExpiry[id], expiry > Date() else {
        metaCache.removeValue(forKey: id)
        cacheExpiry.removeValue(forKey: id)
        return nil
    }
    return metaCache[id]
}
```

### 8.2 Background Preloading

```swift
func preloadNextPage() {
    Task {
        // Preload next page in background
        let nextPage = currentPage + 1
        _ = try? await browseCatalog(..., page: nextPage, ...)
    }
}
```

## Troubleshooting

### Common Issues

1. **Linker Errors**
   - Ensure all Rust targets are built
   - Check library search paths in Xcode
   - Verify static library is not corrupted

2. **Symbol Not Found**
   - Regenerate Swift bindings
   - Clean build folder (Cmd+Shift+K)
   - Rebuild Rust SDK

3. **Crash on Simulator**
   - Ensure correct architecture (x86_64 vs arm64)
   - Use universal binary for simulator

4. **UniFFI Version Mismatch**
   - Ensure Rust SDK and Swift bindings use same UniFFI version
   - Regenerate bindings after UniFFI update

## Next Steps

1. Implement `RustProfileRepository` for profile management
2. Add offline caching with Core Data or Realm
3. Implement analytics tracking
4. Add crashlytics integration
5. Performance profiling with Instruments

## References

- [UniFFI Documentation](https://mozilla.github.io/uniffi-rs/)
- [Swift-Rust Interop](https://developer.apple.com/documentation/swift/imported_c_and_objective-c_apis)
- [iOS Platform Guide](https://doc.rust-lang.org/rustc/platform-support.html)

---

**Last Updated**: 2026-01-18
**Status**: Ready for Integration
