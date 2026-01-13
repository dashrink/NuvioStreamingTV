# React Native Architecture Analysis

**Analysis Date:** 2026-01-13
**Project:** Nuvio Streaming TV
**React Native Version:** 0.81.4

## Executive Summary

Nuvio is running on React Native 0.81.4 with the **New Architecture enabled**, utilizing Hermes engine for JavaScript execution on both iOS and Android platforms. The application is built on Expo SDK 54 and demonstrates a hybrid architecture approach with both legacy bridge-based native modules and modern JSI-based modules.

---

## Architecture Type: New Architecture (Enabled)

### Configuration Status

| Configuration | Status | Source |
|--------------|--------|--------|
| **newArchEnabled** | ✅ **true** | `app.json`, `gradle.properties`, `Podfile.properties.json` |
| **React Native Version** | 0.81.4 | `package.json` |
| **Expo SDK** | 54 | `package.json` |
| **JS Engine** | Hermes | iOS & Android config |

### Evidence of New Architecture

1. **app.json** (Line 11):
   ```json
   "newArchEnabled": true
   ```

2. **android/gradle.properties** (Line 38):
   ```properties
   newArchEnabled=true
   hermesEnabled=true
   ```

3. **ios/Podfile.properties.json** (Line 4):
   ```json
   "newArchEnabled": "true"
   ```

4. **android/app/src/main/java/com/nuvio/app/tv/MainApplication.kt** (Line 34):
   ```kotlin
   override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
   ```

5. **MainApplication.kt uses DefaultNewArchitectureEntryPoint** (Line 43):
   ```kotlin
   DefaultNewArchitectureEntryPoint.releaseLevel = ...
   ```

---

## JavaScript Engine: Hermes

### Hermes Configuration

- **Status:** ✅ Enabled on both platforms
- **iOS:** `"jsEngine": "hermes"` (app.json, line 45)
- **Android:** `hermesEnabled=true` (gradle.properties, line 42)

### Hermes Compiler Path

The project uses custom hermes-compiler path for react-native-tvos compatibility:

```gradle
hermesCommand = new File([...].execute(null, rootDir).text.trim())
                .getParentFile().getAbsolutePath() + "/hermesc/%OS-BIN%/hermesc"
```

### Benefits of Hermes
- Improved app startup time
- Reduced memory usage
- Smaller app bundle size
- Better performance on low-end devices
- Native support for JavaScript features

---

## JSI (JavaScript Interface) Status

### JSI Adoption: ✅ ACTIVE

The application utilizes multiple JSI-based libraries, indicating active use of the JavaScript Interface layer:

| Library | Version | JSI Type | Purpose |
|---------|---------|----------|---------|
| **react-native-reanimated** | ^4.2.0 | JSI/Worklets | High-performance animations |
| **react-native-worklets** | ^0.7.1 | JSI | Multi-threaded JS execution |
| **react-native-mmkv** | ^4.0.0 | JSI | Fast key-value storage |
| **react-native-nitro-modules** | ^0.31.2 | Nitro (JSI) | Modern native module framework |

### JSI Integration Points

1. **Babel Configuration** (`babel.config.js`):
   ```javascript
   plugins: [
     'react-native-worklets/plugin',
     'react-native-boost/plugin',
     'react-native-reanimated/plugin',
   ]
   ```

2. **Worklets Support:**
   - Enables UI thread execution
   - Synchronous native calls
   - No bridge serialization overhead

3. **MMKV Storage:**
   - Direct JSI bindings to native C++ layer
   - Synchronous storage operations
   - ~30x faster than AsyncStorage

---

## TurboModules & Fabric Renderer Status

### TurboModules: ✅ ENABLED

With `newArchEnabled=true`, the application has TurboModules support active. This enables:

- Lazy-loaded native modules
- Improved type safety with codegen
- Better performance through direct JSI calls
- Reduced initialization time

### Fabric Renderer: ✅ ENABLED

The new concurrent renderer is active, providing:

- Improved rendering performance
- Better priority-based rendering
- Enhanced user experience
- Support for concurrent features

### Configuration Evidence

**gradle.properties** (Lines 33-38):
```properties
# Use this property to enable support to the new architecture.
# This will allow you to use TurboModules and the Fabric render in
# your application. You should enable this flag either if you want
# to write custom TurboModules/Fabric components OR use libraries that
# are providing them.
newArchEnabled=true
```

---

## Native Module Patterns Identified

### 1. Legacy Bridge Pattern (Hybrid Compatibility)

**Example: MpvPackage** (`plugins/mpv-bridge/android/mpv/MpvPackage.kt`)

```kotlin
class MpvPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return emptyList()
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return listOf(MpvPlayerViewManager(reactContext))
    }
}
```

**Characteristics:**
- Implements `ReactPackage` interface
- Uses ViewManager for native UI components
- Compatible with both legacy and new architecture
- Registered via autolinking or manual PackageList

### 2. JSI-Based Modules (Modern Pattern)

**Libraries Using JSI:**

1. **react-native-reanimated** (v4.2.0)
   - Direct JSI bindings for animations
   - UI thread worklets
   - Synchronous native calls

2. **react-native-mmkv** (v4.0.0)
   - C++ JSI bindings
   - Synchronous storage operations
   - No bridge overhead

3. **react-native-worklets** (v0.7.1)
   - Multi-threaded JS execution
   - UI and worklet contexts
   - Performance-critical operations

4. **react-native-nitro-modules** (v0.31.2)
   - Next-generation module system
   - Built on JSI foundation
   - Type-safe bindings

### 3. Expo Modules (Autolinking)

**Configuration:**
```kotlin
// MainApplication.kt
override fun getPackages(): List<ReactPackage> =
    PackageList(this).packages.apply {
        // Packages that cannot be autolinked yet can be added manually here
    }
```

**Expo Modules Used:**
- `expo-file-system`
- `expo-notifications`
- `expo-blur`
- `expo-brightness`
- `expo-haptics`
- `expo-libvlc-player`
- And many more (see package.json)

### 4. DefaultReactNativeHost Pattern

**Modern Architecture Integration:**

```kotlin
class MainApplication : Application(), ReactApplication {
  override val reactNativeHost: ReactNativeHost = ReactNativeHostWrapper(
      this,
      object : DefaultReactNativeHost(this) {
        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
      }
  )

  override val reactHost: ReactHost
    get() = ReactNativeHostWrapper.createReactHost(applicationContext, reactNativeHost)
}
```

**Key Features:**
- `DefaultReactNativeHost` provides new architecture defaults
- `ReactNativeHostWrapper` for Expo integration
- `DefaultNewArchitectureEntryPoint` for initialization
- `ReactHost` for new architecture runtime

---

## Platform-Specific Configuration

### iOS (tvOS Target)

**Podfile Configuration:**
```ruby
platform :tvos, '15.1'
ENV['RCT_NEW_ARCH_ENABLED'] ||= '0' if podfile_properties['newArchEnabled'] == 'false'
```

**Key Settings:**
- Target: tvOS 15.1+
- Hermes: Enabled
- New Architecture: Enabled
- Framework linking: Configurable via `ios.useFrameworks`

### Android (TV Target)

**Build Configuration:**
```gradle
minSdkVersion: 26
targetSdkVersion: 35
compileSdkVersion: 35
architectures: [arm64-v8a, armeabi-v7a, x86, x86_64]
```

**Key Settings:**
- Min SDK: 26 (Android 8.0)
- Hermes: Enabled
- New Architecture: Enabled
- Edge-to-edge: Enabled

---

## Metro Bundler Configuration

### Custom Optimizations

**metro.config.js:**

```javascript
// Tree shaking and minification
config.transformer = {
  minifierConfig: {
    compress: {
      drop_console: true,
      drop_debugger: true,
    },
  },
};

// TV platform extraction pattern
if (isTV) {
  sourceExts.unshift('tv.tsx', 'tv.ts');
}
```

**Features:**
- SVG transformer integration
- TV-specific file resolution (`.tv.tsx`, `.tv.ts`)
- Console dropping in production
- Optimized watch folders

---

## Migration Readiness Assessment

### Current State: ✅ New Architecture Enabled

The application is **already running on the New Architecture**, which puts it ahead of React Native 0.76+ requirements.

### Compatibility Status

| Component | Status | Notes |
|-----------|--------|-------|
| **Core Architecture** | ✅ Ready | New Architecture already enabled |
| **JSI Integration** | ✅ Active | Multiple JSI-based libraries in use |
| **TurboModules** | ✅ Enabled | Via newArchEnabled flag |
| **Fabric Renderer** | ✅ Active | Concurrent rendering available |
| **Hermes Engine** | ✅ Optimized | Latest Hermes with JSI support |
| **Expo SDK** | ⚠️ Consider Update | Currently SDK 54, RN 0.76 requires SDK 52+ compatibility check |
| **Native Modules** | ⚠️ Hybrid | Mix of legacy and modern patterns |

### Potential Migration Concerns

1. **React Native Version Gap:**
   - Current: 0.81.4
   - Target (0.76+): May require careful dependency updates
   - Some dependencies may need compatibility checks

2. **Legacy Bridge Modules:**
   - MpvPackage still uses legacy `ReactPackage` pattern
   - Should migrate to TurboModule or Fabric component spec
   - Current pattern is forward-compatible but not optimal

3. **Expo SDK Compatibility:**
   - Need to verify Expo SDK 54 compatibility with RN 0.76+
   - May require Expo SDK upgrade
   - Check for breaking changes in Expo modules

4. **Third-Party Dependencies:**
   - Several libraries may need updates:
     - `react-native-video`: ^6.17.0 → check 0.76+ compatibility
     - `react-native-google-cast`: ^4.9.1 → verify support
     - `@shopify/flash-list`: ^2.2.0 → should be compatible

---

## Recommendations

### Short-Term (Current State)

1. ✅ **Continue using New Architecture** - Already enabled and working
2. ✅ **Maintain Hermes optimization** - Excellent performance baseline
3. ⚠️ **Audit third-party dependencies** - Ensure all support New Architecture
4. ⚠️ **Monitor JSI module updates** - Keep JSI-based libraries current

### Medium-Term (Pre-0.76 Migration)

1. 🔄 **Migrate legacy native modules** - Convert MpvPackage to TurboModule/Fabric
2. 🔄 **Update Expo SDK** - Prepare for SDK version aligned with RN 0.76+
3. 🔄 **Test New Architecture thoroughly** - Ensure all features work correctly
4. 🔄 **Document custom native code** - Prepare migration path for custom modules

### Long-Term (0.76+ Migration)

1. 📋 **Plan React Native upgrade path** - 0.81.4 → 0.76+ requires careful testing
2. 📋 **Update all dependencies** - Ensure ecosystem compatibility
3. 📋 **Refactor deprecated APIs** - Remove any legacy patterns
4. 📋 **Performance benchmarking** - Validate improvements post-migration

---

## Technical Debt & Opportunities

### Technical Debt

1. **Legacy Bridge Pattern in MpvPackage**
   - Impact: Medium
   - Effort: Medium
   - Priority: Medium (functional but not optimal)

2. **Mixed Module Patterns**
   - Impact: Low
   - Effort: Low
   - Priority: Low (doesn't block migration)

3. **Potential Version Misalignment**
   - Impact: High (for 0.76+ migration)
   - Effort: High
   - Priority: High (requires testing)

### Opportunities

1. **Already on New Architecture**
   - Major advantage for 0.76+ migration
   - Less work than projects still on legacy

2. **Strong JSI Adoption**
   - Modern performance characteristics
   - Easier migration path

3. **Hermes Optimization**
   - Better baseline for performance
   - Reduced migration risk

4. **Expo Integration**
   - Simplified native module management
   - Over-the-air updates capability

---

## Conclusion

Nuvio is in a **strong position** for React Native 0.76+ migration:

- ✅ **New Architecture already enabled** (major milestone complete)
- ✅ **Hermes engine optimized** (performance foundation solid)
- ✅ **JSI integration active** (modern patterns in use)
- ✅ **TurboModules & Fabric enabled** (core requirements met)
- ⚠️ **Some legacy patterns remain** (requires refactoring)
- ⚠️ **Version gap to address** (0.81.4 → 0.76+ needs testing)

The primary focus should be on:
1. Dependency compatibility audits
2. Legacy module migration (MpvPackage)
3. Thorough testing of New Architecture features
4. Expo SDK alignment with target RN version

**Overall Migration Risk: LOW TO MEDIUM** - The application is architecturally ready, with main work being dependency updates and testing rather than fundamental architecture changes.
