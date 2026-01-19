<summary>
## Summary: Build home screen with carousels in SwiftUI (iOS + tvOS)

### Changes Implemented
- Implemented `HomeView` with a hero carousel, continue watching section, watchlist, and category rows.
- Created `HomeViewModel` to manage state and fetch data from `CatalogRepository`.
- Built `HeroCarouselView` using `TabView` with auto-advance and platform-specific styling (iOS vs tvOS).
- Built `CategoryRowView` using `LazyHStack` inside a horizontal `ScrollView` for efficient rendering.
- Integrated `PosterCard` component for consistent item display and focus management on tvOS.
- Added mock logic for "Continue Watching" and "Watchlist" data in `HomeViewModel`.
- Ensured tvOS support with proper focus handling and layout adjustments.

### Files Modified
- `ios/NuvioTV/Sources/ViewModels/HomeViewModel.swift` (Created)
- `ios/NuvioTV/Sources/UI/Home/HomeView.swift` (Created)
- `ios/NuvioTV/Sources/UI/Home/HeroCarouselView.swift` (Created)
- `ios/NuvioTV/Sources/UI/Home/CategoryRowView.swift` (Created)

### Notes for Developer
- The implementation currently uses `MockCatalogRepository`. Integration with the actual Rust SDK `CatalogRepository` will happen in the subsequent integration phase.
- "Continue Watching" and "Watchlist" are currently populated with mock data from the catalog as a placeholder until the specific repositories for those features are implemented.

### Verification Status
- Verified that all created files exist and contain the required Swift structures using a temporary Playwright test suite (`home-verification.spec.ts`).
- Confirmed implementation of `ObservableObject`, `TabView` for carousel, `LazyHStack` for rows, and tvOS specific conditional code.
</summary>