# Nuvio Native iOS/tvOS Project

This directory contains the source code for the native iOS and tvOS applications (Migration Phase 3).

## Structure

- **Apps/**: Contains the App Entry points and platform-specific resources.
  - `NuvioApp/`: iOS Application source.
  - `NuvioTVApp/`: tvOS Application source.
- **Sources/**: Swift Package Manager targets for shared logic.
  - `NuvioCore/`: Core architecture, Networking, Models, DI.
  - `NuvioFeatures/`: Shared UI features and Business Logic.
- **Package.swift**: Manifest defining the shared modules.

## Setup Instructions (for macOS Developers)

1. **Create Xcode Project**:
   - Open Xcode and create a new Project.
   - Choose "Multiplatform" or create separate targets for iOS and tvOS.
   - Save it in this directory (e.g., `NuvioNative.xcodeproj`).

2. **Add Local Package**:
   - Drag the `nuvio-ios` folder (or just the `Package.swift`) into the Xcode Project file navigator.
   - Or add the local package via "Add Package Dependencies" -> "Add Local...".

3. **Configure Targets**:
   - **iOS App Target**:
     - Add `NuvioCore` and `NuvioFeatures` libraries as frameworks.
     - Add files from `Apps/NuvioApp/` to the target.
   - **tvOS App Target**:
     - Add `NuvioCore` and `NuvioFeatures` libraries as frameworks.
     - Add files from `Apps/NuvioTVApp/` to the target.

4. **Build and Run**:
   - Select the target and run on Simulator or Device.

## Architecture

- **MVVM**: Using `BaseViewModel` and `ObservableObject`.
- **Combine**: For reactive state management.
- **DI**: Simple `DIContainer` in `NuvioCore`.
- **Navigation**: Coordinator protocol defined in `NuvioCore`.
