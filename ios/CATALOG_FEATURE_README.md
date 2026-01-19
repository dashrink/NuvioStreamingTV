# iOS Catalog Browsing Feature

## Overview

This document describes the iOS/tvOS catalog browsing feature implementation in SwiftUI. The feature provides a grid-based browsing interface for movies and series with filtering, sorting, and infinite scroll pagination.

## Architecture

The implementation follows the MVVM (Model-View-ViewModel) pattern with a repository abstraction layer:

```
View (SwiftUI) → ViewModel (ObservableObject) → Repository (Protocol) → Data Source
```

### Key Components

1. **Models** (`CatalogModels.swift`)
   - `Meta`: Content metadata structure
   - `Catalog`: Collection of content items
   - `CatalogPage`: Paginated results
   - `FilterState`: Current filter configuration
   - `SortOption`: Available sorting options
   - `CatalogBrowseUiState`: UI state management

2. **Repository Layer** (`CatalogRepository.swift`)
   - `CatalogRepository` protocol: Defines catalog operations
   - `MockCatalogRepository`: Mock implementation for testing without Rust SDK

3. **ViewModel** (`CatalogBrowseViewModel.swift`)
   - `CatalogBrowseViewModel`: Manages UI state and business logic
   - Uses `@Published` properties for reactive updates
   - Implements async/await for asynchronous operations

4. **Views**
   - `CatalogBrowseView`: Main catalog browsing screen
   - `FilterSection`: Filter controls (type, sort, genre)
   - `PosterCard`: Reusable content card component
   - `FilterChip`: Reusable filter chip component

## Platform-Specific Features

### Grid Layout

The grid automatically adapts to the platform:

- **tvOS**: 6 columns (optimal for 10-foot UI)
- **iPad**: 4-5 columns (4 portrait, 5 landscape)
- **iPhone**: 2-3 columns (2 portrait, 3 landscape)

Implementation using `LazyVGrid`:

```swift
LazyVGrid(columns: gridColumns, spacing: 16) {
    ForEach(items) { meta in
        PosterCard(meta: meta, onClick: { ... })
    }
}
```

### tvOS Focus Engine

The implementation includes full tvOS focus engine support:

1. **PosterCard Focus**
   - Uses `@FocusState` property wrapper
   - Scale animation on focus (1.1x)
   - Border highlight (4px white)
   - Enhanced shadow effect

2. **FilterChip Focus**
   - Scale animation (1.1x)
   - Background color change
   - Border highlight

3. **Focus Management**
   - All interactive elements use `.focusable(true)`
   - Proper focus ordering with `preferredFocusEnvironments` (can be extended)

### iOS Touch Interaction

For iOS devices:

- Standard tap gestures
- Scale-down animation on press (0.95x)
- Native scroll behavior with momentum
- Pull-to-refresh (can be added)

## Features

### 1. Content Type Toggle

Switch between Movies and Series:

```swift
FilterChip(
    text: "Movies",
    selected: filterState.contentType == "movie",
    onClick: { viewModel.setContentType("movie") }
)
```

### 2. Sorting Options

Four sort options:
- **Trending** (default)
- **Popular**
- **Newest**
- **Top Rated**

### 3. Genre Filtering

Horizontally scrollable genre chips:
- "All" option to clear genre filter
- 22 genre options (action, comedy, drama, etc.)
- Genres loaded dynamically from repository

### 4. Infinite Scroll Pagination

Automatic pagination when scrolling:

```swift
private func checkIfNeedToLoadMore(_ meta: Meta) {
    guard let index = items.firstIndex(where: { $0.id == meta.id }) else { return }

    let threshold = items.count - gridColumnCount
    if index >= threshold && hasMore && !isLoadingMore {
        viewModel.loadMore()
    }
}
```

Features:
- Loads next page when within 1 row of the end
- Shows loading indicator at bottom during pagination
- Prevents duplicate requests with `isLoadingMore` flag
- Respects `hasMore` flag from backend

### 5. Error Handling

Three states:
- **Loading**: Shows centered progress indicator
- **Error**: Shows error message with retry button
- **Empty**: Shows "No items found" message

### 6. Filter Clearing

"Clear Filters" button appears when:
- Genre is selected
- Year is selected (future enhancement)
- Sort is not "Trending"

## Data Flow

### Initial Load

1. ViewModel initializes → calls `loadGenres()` and `loadCatalog()`
2. Repository fetches data asynchronously
3. Results update `@Published uiState`
4. SwiftUI view automatically re-renders

### Filter Changes

1. User taps filter chip → calls ViewModel method
2. ViewModel updates `filterState`
3. Calls `loadCatalog(resetPage: true)`
4. Repository fetches filtered results
5. UI updates reactively

### Pagination

1. User scrolls → `onAppear` modifier triggers
2. `checkIfNeedToLoadMore()` detects proximity to end
3. ViewModel calls `loadMore()`
4. Repository fetches next page
5. New items appended to existing list
6. UI updates automatically

## Integration with Rust SDK

To integrate with the Rust SDK (future work):

1. Create `RustCatalogRepository` implementing `CatalogRepository`
2. Use UniFFI-generated Swift bindings for `StremioService`
3. Replace `MockCatalogRepository` with `RustCatalogRepository`

Example structure:

```swift
class RustCatalogRepository: CatalogRepository {
    private let service: StremioService

    init(service: StremioService) {
        self.service = service
    }

    func browseCatalog(...) async throws -> CatalogPage {
        let metas = try await service.getCatalog(...)
        return CatalogPage(items: metas.map { mapToMeta($0) }, ...)
    }
}
```

## File Structure

```
ios/NuvioTV/Sources/
├── Models/
│   └── CatalogModels.swift          # Data models
├── Data/
│   └── Repository/
│       └── CatalogRepository.swift  # Repository protocol & mock
├── ViewModels/
│   └── CatalogBrowseViewModel.swift # Business logic
└── UI/
    ├── Catalog/
    │   ├── CatalogBrowseView.swift  # Main screen
    │   └── FilterSection.swift      # Filter UI
    └── Components/
        ├── PosterCard.swift         # Content card
        └── FilterChip.swift         # Filter chip
```

## Testing

### Mock Repository

The `MockCatalogRepository` provides:
- Realistic data generation
- Simulated network delays
- Pagination support (5 pages max)
- Genre filtering
- All catalog operations

### Manual Testing Checklist

- [ ] Grid displays 6 columns on tvOS
- [ ] Grid displays 4-5 columns on iPad
- [ ] Grid displays 2-3 columns on iPhone
- [ ] Content type toggle switches correctly
- [ ] Sort options change catalog order
- [ ] Genre filter updates results
- [ ] Infinite scroll loads more items
- [ ] Loading states display correctly
- [ ] Error state shows retry button
- [ ] Focus engine works on tvOS
- [ ] Touch interactions work on iOS

## Performance Considerations

1. **LazyVGrid**: Only renders visible items
2. **AsyncImage**: Built-in image caching
3. **Async/await**: Non-blocking data fetches
4. **StateObject**: ViewModel lifecycle tied to view
5. **OnAppear efficiency**: Only checks last items for pagination

## Future Enhancements

1. **Year Filter**: Add year picker UI
2. **Search Integration**: Add search bar
3. **Rating Filter**: Filter by minimum rating
4. **Pull-to-Refresh**: iOS refresh control
5. **Deep Linking**: Navigate to specific catalog filters
6. **Accessibility**: VoiceOver labels and hints
7. **Localization**: Multi-language support
8. **Caching**: Local cache for offline viewing
9. **Animations**: Smooth grid transitions
10. **Grid Size Toggle**: User preference for column count

## Dependencies

- **SwiftUI**: UI framework
- **Combine**: Reactive programming (via `@Published`)
- **Foundation**: Core Swift types
- **UIKit** (iOS): Device orientation detection

## Minimum Requirements

- **iOS**: 15.0+
- **tvOS**: 15.0+
- **Xcode**: 14.0+
- **Swift**: 5.7+

## Notes

- The implementation is ready for Rust SDK integration
- All UI is platform-adaptive (tvOS/iOS/iPadOS)
- Focus engine support is built-in for tvOS
- Mock data allows testing without backend
- MVVM pattern enables easy unit testing
- Repository pattern allows swapping data sources

---

**Author**: Claude Code
**Date**: 2026-01-18
**Status**: Complete - Ready for Rust SDK Integration
