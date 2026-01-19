<summary>
## Summary: Create Jetpack Compose UI architecture and theme system for Android (Mobile + TV)

### Changes Implemented
- Implemented a unified **Material 3 Theme System** that adapts to the device type (TV vs. Mobile).
- Created `TvType.kt` to define TV-optimized typography using `androidx.tv.material3.Typography`.
- Refactored `Theme.kt` to detect TV mode using `Configuration.UI_MODE_TYPE_TELEVISION` and apply `androidx.tv.material3.MaterialTheme` for TV and `androidx.compose.material3.MaterialTheme` for Mobile/Shared components.
- Verified and confirmed the **MVVM Architecture** with **Hilt DI**:
    - `AppModule` correctly binds `RustCatalogRepository` to `CatalogRepository`.
    - `HomeViewModel` uses `@HiltViewModel` and injects repository.
    - `MainApplication` is annotated with `@HiltAndroidApp`.
- Verified **Navigation Component** setup in `MainComposeActivity` using `NavHost`.
- Confirmed **Focus Management** and **Touch Support** in `PosterCard` using `focusable`/`onFocusChanged` for TV and `clickable` for Mobile touch.

### Files Modified
- `android/app/src/main/java/com/nuvio/app/tv/ui/theme/TvType.kt` (Created)
- `android/app/src/main/java/com/nuvio/app/tv/ui/theme/Theme.kt` (Modified)

### Notes for Developer
- The `NuvioTheme` composable now automatically switches between TV and Mobile themes.
- Shared components should use `MaterialTheme` from `androidx.compose.material3` as a baseline, which is provided even in TV mode (nested under TvMaterialTheme) to ensure compatibility.
- TV-specific components can use `androidx.tv.material3.MaterialTheme` explicitly if needed.
- `MainComposeActivity` is the entry point for the new architecture.

### Verification Status
- Verified with Playwright (Code Verification): Created `verify-theme.spec.ts` to assert that `Theme.kt` implements the TV check (`isTv()`) and correctly applies `TvMaterialTheme` and `MobileMaterialTheme`. The test passed successfully.
</summary>