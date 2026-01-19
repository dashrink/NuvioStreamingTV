<summary>
## Summary: Build video player with AVPlayer (iOS + tvOS variants)

### Changes Implemented
- Created `PlayerModels.swift` containing state, tracks, and speed enums.
- Created `PlayerViewModel.swift` handling `AVPlayer`, `AVPlayerItem` observation, track selection (Audio/Subtitles), and playback control.
- Created `PlayerView.swift` implementing `AVPlayerViewController` (without native controls) and a custom SwiftUI overlay.
- Created `PlayerControls.swift` with Play/Pause, Skip, Seek Slider, and a Settings Sheet for track/speed selection.
- Added buffering indicator to `PlayerView`.

### Files Modified
- `ios/NuvioTV/Sources/Models/PlayerModels.swift` (Created)
- `ios/NuvioTV/Sources/ViewModels/PlayerViewModel.swift` (Created)
- `ios/NuvioTV/Sources/UI/Player/PlayerView.swift` (Created)
- `ios/NuvioTV/Sources/UI/Player/PlayerControls.swift` (Created)
- `IOS_PLAYER_VERIFICATION.md` (Created)

### Notes for Developer
- The `PlayerView` expects a URL, title, and subtitle.
- To use, navigate to `PlayerView` from `ContentView` or your navigation router.
- Native `AVPlayerViewController` controls are disabled (`showsPlaybackControls = false`) to allow the custom SwiftUI overlay.
- tvOS support is included via `#if os(tvOS)` checks and standard SwiftUI focus handling (though specific custom focus guides might be needed for complex layouts).

### Verification Status
- Verified file existence and basic integrity using a temporary Playwright test `ios-player-verification.spec.ts`.
- Created `IOS_PLAYER_VERIFICATION.md` detailing manual verification steps since native UI cannot be tested with Playwright.
</summary>