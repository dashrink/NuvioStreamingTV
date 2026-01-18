# Verification: Android Home & Discovery UI

This document outlines how to verify the newly implemented Android Home and Discovery UI components, built with Jetpack Compose and integrated with Hilt and the Rust SDK bindings.

## 1. Build Verification

The project has been successfully configured to support Jetpack Compose, Hilt, and the Rust SDK bindings.

To verify the build, run:

```bash
cd android
./gradlew :app:assembleDebug
```

**Expected Result:** `BUILD SUCCESSFUL`

## 2. Launching the New UI

The new UI is hosted in `MainComposeActivity`, which is separate from the existing React Native `MainActivity`.

### Methods to Launch:

**A. Using adb (Recommended for testing):**
You can launch the new Home screen directly using the custom deep link scheme we configured.

```bash
adb shell am start -W -a android.intent.action.VIEW -d "nuvio://home" com.nuvio.app.tv
```

**B. Changing the Launcher (Optional):**
To make the new Native UI the default launcher, modify `android/app/src/main/AndroidManifest.xml`:
1. Move the `<intent-filter>` with `android.intent.category.LAUNCHER` from `.MainActivity` to `.MainComposeActivity`.

## 3. UI Features to Verify

Once launched, you should observe:

### **Home Screen**
- **Hero Carousel**: A large, immersive banner at the top showing "Trending" content.
- **Horizontal Rows**: fast-scrolling rows for different categories.
- **Focus Interaction**: On TV, using D-Pad should highlight cards with a scaling animation and border.

### **Discovery Screen**
- **Search Box**: An input field optimized for TV keyboards.
- **Mock Search**: Typing "Matrix", "Inception", or "Interstellar" will filter results (debounced).
- **Grid Layout**: Results appear in a responsive grid.

### **Details Screen**
- Clicking any poster navigates to a details view.
- **Content Detail Sheet**: Shows a large background, metadata (Title, Description), and a "Watch Now" button.

## 4. Architecture & Data

- **Mock Data**: Currently, `MockCatalogRepository` is providing data to ensure the UI works smoothly while the Rust SDK bindings are finalized.
- **Rust Integration**: The `uniffi.nuvio_core` package is integrated. `RustCatalogRepository` exists but points to `NotImplementedError` until the Rust `StremioService` is fully exposed via UniFFI.
- **Dependency Injection**: Hilt is managing `ViewModel` and `Repository` injection.

## 5. Next Steps

- **Rust SDK**: Expose `StremioService` methods (like `get_catalog`) via UniFFI in `lib.rs` to replace the Mock repository.
- **Player Integration**: Connect the "Play" button to the existing `PlayerActivity`.
