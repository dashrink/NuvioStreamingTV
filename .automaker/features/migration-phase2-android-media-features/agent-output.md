<summary>
## Summary: Android Media Features

### Changes Implemented
- **Google Cast Integration**:
    - Added `CastButton` to `PlayerControls` header.
    - Implemented Cast session management in `AndroidVideoPlayer` using `react-native-google-cast`.
    - Automatically loads current media to cast device when session starts and pauses local playback.
- **Picture-in-Picture (PiP)**:
    - Added PiP toggle button to `PlayerControls` (bottom row).
    - Implemented `handleEnterPip` and `handlePipStatusChanged` in `AndroidVideoPlayer`.
    - Updated `VideoSurface` to accept `pictureInPicture` prop and handle status changes.
    - Hides player controls automatically when entering PiP.
- **Background Playback**:
    - Enabled `playInBackground={true}` in `VideoSurface` (supports audio playback when app is backgrounded).
- **Media Session Controls**:
    - Passed metadata (`title`, `subtitle`, `artist`, `artwork`) to `VideoSurface` and `Video` component.
    - This enables standard Android media controls on lock screen and notification shade (and Android Auto media session).

### Files Modified
- `src/components/player/AndroidVideoPlayer.tsx`: Main logic for Cast, PiP, and props passing.
- `src/components/player/android/components/VideoSurface.tsx`: Updated to support PiP props, background play, and metadata.
- `src/components/player/controls/PlayerControls.tsx`: Added Cast and PiP buttons.

### Notes for Developer
- **Cast**: Requires a valid `receiverAppId` in `app.json` (currently configured).
- **PiP**: Android manifest must have `android:supportsPictureInPicture="true"` (usually handled by expo config/plugin).
- **Background Play**: Requires `WAKE_LOCK` permission (present) and properly configured background modes (handled by `react-native-video` or expo config).
- **Android Auto**: Basic media controls are enabled via Media Session metadata. Full browsing requires a `MediaBrowserService` implementation which is outside the scope of `react-native-video` but playback controls will work.

### Verification Status
- Verified code structure and presence of required implementations using a temporary Playwright test script (`verify-android-features.spec.ts`).
- Confirmed imports and props for `react-native-google-cast` and `react-native-video`.
</summary>