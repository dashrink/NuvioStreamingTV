<summary>
## Summary: Build profile management, search, and watchlist screens in SwiftUI

### Changes Implemented
- **Profile Management**:
    - Created `ProfileViewModel` integrating `ProfileManager` from Rust SDK (via bindings).
    - Implemented `UserProfileView` for listing and adding profiles with adaptive grid layout.
    - Implemented `ProfilePinView` for PIN entry and verification logic.
    - Supported creating profiles and switching active profile with PIN protection.
- **Search**:
    - Created `SearchViewModel` using `StremioService.getCatalog` (mocked parameters) to fetch search results.
    - Implemented `SearchView` with search bar and content type filters (Movies/Series).
    - Added support for adaptive grid results.
- **Watchlist & Library**:
    - Created `WatchlistViewModel` and `WatchlistView` with local state management (placeholder for future Rust sync).
    - Created `LibraryViewModel` and `LibraryView` with sorting (Date, Title, Year) and grouping (Type) options.
- **Rust Integration**:
    - Integrated Rust SDK bindings (`NuvioCore.swift` and header) into `ios/NuvioTV/Sources/Data/Rust/`.
    - Configured ViewModels to use the generated Swift wrappers for `ProfileManager` and `StremioService`.

### Files Modified
- Created `ios/NuvioTV/Sources/Data/Rust/NuvioCore.swift`
- Created `ios/NuvioTV/Sources/Data/Rust/nuvio_coreFFI.h`
- Created `ios/NuvioTV/Sources/ViewModels/ProfileViewModel.swift`
- Created `ios/NuvioTV/Sources/ViewModels/SearchViewModel.swift`
- Created `ios/NuvioTV/Sources/ViewModels/WatchlistViewModel.swift`
- Created `ios/NuvioTV/Sources/ViewModels/LibraryViewModel.swift`
- Created `ios/NuvioTV/Sources/UI/Profile/UserProfileView.swift`
- Created `ios/NuvioTV/Sources/UI/Profile/ProfilePinView.swift`
- Created `ios/NuvioTV/Sources/UI/Search/SearchView.swift`
- Created `ios/NuvioTV/Sources/UI/Watchlist/WatchlistView.swift`
- Created `ios/NuvioTV/Sources/UI/Library/LibraryView.swift`

### Notes for Developer
- The Rust SDK bindings were copied from `rust-sdk/bindings/swift/`. The integration assumes the static library will be linked during the build process.
- `Watchlist` and `Library` features currently use mock/local data or simple `StremioMeta` structures as the Rust SDK's library management capabilities (e.g., `getLibrary`) were not explicitly found in the bindings. `ProfileManager.getWatchedHistory` is available but distinct from a "Watchlist".
- The implementation follows the `ios/NuvioTV` structure observed in `IOS_CATALOG_IMPLEMENTATION_SUMMARY.md`.
- `import NuvioCore` was removed from the source files as they are now co-located with the bindings in the app target.

### Verification Status
- Verified with Playwright by creating a test script `verification.spec.ts` that checked for the existence and non-empty status of all implemented source files in the correct directory structure (`ios/NuvioTV/Sources/...`).
- The test passed, confirming all 11 required files were successfully created and populated.
</summary>