---
name: Native UI Conversion Expert
description: Expert in migrating and converting React Native UI components to high-performance Native code (Kotlin/Swift) for Android TV, Mobile, and iOS/TVOS.
---

# Native UI Conversion Expert

This skill provides a roadmap and technical expertise for moving from a React Native bridge-based UI to a fully native implementation using modern declarative frameworks.

## Strategic Approach

### 1. Component Mapping
| React Native | Android (Kotlin/Compose) | iOS/TVOS (Swift/SwiftUI) |
|--------------|---------------------------|--------------------------|
| `<View>`     | `Box`, `Column`, `Row`    | `ZStack`, `VStack`, `HStack` |
| `<Text>`     | `Text`                    | `Text`                   |
| `<Image>`    | `AsyncImage` (Coil)       | `AsyncImage`             |
| `<FlatList>` | `LazyColumn` / `LazyRow`  | `List` / `ScrollView` + `LazyVStack` |
| `<Pressable>`| `Modifier.clickable`      | `Button` / `onTapGesture` |

### 2. Layout Engine Translation
React Native uses Yoga (Flexbox). SwiftUI and Compose use their own layout logic.
- **Compose**: Based on Constraints and simplified Flex-like Row/Column.
- **SwiftUI**: Layout priority and spacers.
- **Key Task**: Ensure pixel-perfect reproduction of margins, paddings, and alignment.

### 3. TV Focus Management (Critical)
The most difficult part of conversion for Streaming Apps is the focus engine.
- **RN**: `onFocus`, `hasTVPreferredFocus`, `nextFocusUp`.
- **Android TV (Compose)**: `Modifier.focusable()`, `FocusRequester`, `Modifier.onFocusChanged`. Use `D-Pad` interaction handlers.
- **iOS/TVOS (SwiftUI)**: `@FocusState`, `FocusSelection`, `prefersDefaultFocus`. Handle the Siri Remote's fluid movement.

## Performance Optimization
- **Flattening View Hierarchy**: Native allows for flatter hierarchies compared to the deep trees often found in RN.
- **Image Pre-fetching**: Utilize native capabilities (Glide/Coil on Android, SDWebImage/Kingfisher on iOS) to manage memory-efficient rendering of large posters.
- **Thread Management**: Ensure heavy operations (API calls, image processing) stay off the main UI thread.

## Bridging Strategies
If doing a gradual migration:
1. **Module Injection**: Replace specific RN components with Native Modules (`requireNativeComponent`).
2. **Screen-at-a-time**: Rewrite entire screens and navigate between RN and Native containers.
3. **Data Sharing**: Use a shared State/Persistence layer (often in C++ or Rust) to keep data consistent between both worlds.

## Best Practices
- **Shared Design Tokens**: Use a single source of truth (JSON) to generate themes for both Kotlin and Swift.
- **Unit Testing**: Test the ViewModels/Logic independently of the UI framework.
- **Accessibility Verification**: Ensure TalkBack and VoiceOver work identically after conversion.
