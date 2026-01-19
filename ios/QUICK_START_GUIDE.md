# iOS Catalog Feature - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

This guide helps you quickly integrate and test the iOS catalog browsing feature.

---

## Step 1: Verify Files (30 seconds)

Run the verification script:

```bash
cd /home/dashrink/Desktop/NuvioStreamingTV/ios
./verify_catalog_feature.sh
```

Expected output:
```
All checks passed! ✓
Total files: 8
Success: 8
```

---

## Step 2: Add to Xcode Project (2 minutes)

### Option A: Drag & Drop (Recommended)

1. Open your Xcode project: `NuvioTV.xcodeproj`
2. In Xcode, right-click on project → "Add Files to NuvioTV..."
3. Navigate to `ios/NuvioTV/Sources/`
4. Select all folders and click "Add"
5. Ensure "Copy items if needed" is **unchecked**
6. Ensure target is **NuvioTV**

### Option B: Manual Setup

1. Open Xcode project
2. Create groups matching directory structure:
   ```
   NuvioTV/
   ├── Models/
   ├── Data/Repository/
   ├── ViewModels/
   ├── UI/
   │   ├── Catalog/
   │   └── Components/
   └── NuvioTVApp.swift
   ```
3. Add each `.swift` file to appropriate group

---

## Step 3: Build & Test (2 minutes)

### Build the Project

1. Select target: **NuvioTV (iOS)** or **NuvioTV (tvOS)**
2. Select simulator: **iPhone 15** or **Apple TV**
3. Press **Cmd+B** to build
4. Fix any import issues if needed

### Run the App

1. Press **Cmd+R** to run
2. App should launch with catalog browse screen
3. Test basic functionality:
   - Scroll through grid
   - Tap/click content type filters
   - Change sort options
   - Select different genres
   - Scroll to trigger pagination

### Run Tests

1. Press **Cmd+U** to run unit tests
2. All 10 tests should pass

---

## Step 4: Customize (30 seconds)

### Change to Rust SDK Repository

Edit `NuvioTVApp.swift`:

```swift
// Change from:
let repository = MockCatalogRepository()

// To:
let repository = RustCatalogRepository(service: stremioService)
```

### Enable Debug Mode

Add environment variable in Xcode:

1. Edit Scheme → Run → Arguments → Environment Variables
2. Add: `USE_MOCK = 1`

This keeps mock data during development.

---

## Common Issues & Solutions

### Issue: "Cannot find type 'Meta' in scope"

**Solution**: Ensure `CatalogModels.swift` is added to target
1. Select file in Xcode
2. Check "Target Membership" in inspector
3. Enable **NuvioTV** target

### Issue: "Command SwiftCompile failed"

**Solution**: Clean build folder
1. Press **Cmd+Shift+K** (Clean)
2. Press **Cmd+Shift+Option+K** (Clean Build Folder)
3. Rebuild with **Cmd+B**

### Issue: Grid not showing on tvOS

**Solution**: Check platform detection
- Ensure conditional compilation works
- Check target SDK is set correctly

### Issue: Mock data not loading

**Solution**: Check async initialization
- Add breakpoint in `init()` of ViewModel
- Verify repository is injected correctly

---

## Platform-Specific Testing

### Testing on tvOS

1. Select **Apple TV** simulator
2. Use keyboard shortcuts:
   - **Arrow keys**: Navigate focus
   - **Enter**: Select item
   - **Esc**: Back
3. Verify:
   - 6-column grid
   - Focus animations work
   - Focus borders appear
   - Navigation is smooth

### Testing on iPad

1. Select **iPad Pro** simulator
2. Test both orientations:
   - **Cmd+→**: Rotate right
   - **Cmd+←**: Rotate left
3. Verify:
   - Portrait: 4 columns
   - Landscape: 5 columns
   - Touch interactions work

### Testing on iPhone

1. Select **iPhone 15** simulator
2. Test both orientations
3. Verify:
   - Portrait: 2 columns
   - Landscape: 3 columns
   - Tap interactions work

---

## Quick Reference

### File Locations

```
ios/NuvioTV/Sources/
├── Models/CatalogModels.swift              # Data models
├── Data/Repository/CatalogRepository.swift # Repository
├── ViewModels/CatalogBrowseViewModel.swift # Business logic
├── UI/
│   ├── Catalog/
│   │   ├── CatalogBrowseView.swift        # Main screen
│   │   └── FilterSection.swift            # Filters
│   └── Components/
│       ├── PosterCard.swift               # Content card
│       └── FilterChip.swift               # Filter chip
└── NuvioTVApp.swift                        # App entry
```

### Key Classes

- `CatalogBrowseViewModel` - Main business logic
- `CatalogBrowseView` - Main UI screen
- `MockCatalogRepository` - Test data source
- `PosterCard` - Content display component

### Keyboard Shortcuts

- **Cmd+B** - Build
- **Cmd+R** - Run
- **Cmd+U** - Test
- **Cmd+.** - Stop
- **Cmd+Shift+K** - Clean

---

## What to Test

### Functional Tests

- ✅ Grid displays correctly on all devices
- ✅ Content type toggle (Movies ↔ Series)
- ✅ Sort options change content
- ✅ Genre filters work
- ✅ Infinite scroll loads more items
- ✅ Loading indicator appears
- ✅ Error state shows retry button

### Performance Tests

- ✅ Smooth scrolling (60fps)
- ✅ No memory leaks
- ✅ Quick filter changes
- ✅ Fast pagination

### Platform Tests

- ✅ tvOS: 6 columns, focus works
- ✅ iPad: 4-5 columns, orientation
- ✅ iPhone: 2-3 columns, orientation

---

## Next Steps

### For Testing
1. ✅ Run verification script
2. ✅ Build project
3. ✅ Run on simulators
4. ✅ Test all features
5. ✅ Run unit tests

### For Production
1. 📋 Follow `RUST_SDK_INTEGRATION_GUIDE.md`
2. 📋 Implement `RustCatalogRepository`
3. 📋 Set up dependency injection
4. 📋 Add analytics
5. 📋 Deploy to TestFlight

---

## Support & Documentation

- **Full Documentation**: `ios/CATALOG_FEATURE_README.md`
- **Integration Guide**: `ios/RUST_SDK_INTEGRATION_GUIDE.md`
- **Implementation Summary**: `IOS_CATALOG_IMPLEMENTATION_SUMMARY.md`
- **Verification Script**: `ios/verify_catalog_feature.sh`

---

## Quick Commands

```bash
# Verify implementation
./verify_catalog_feature.sh

# Build for iOS
xcodebuild -scheme NuvioTV -sdk iphonesimulator

# Run tests
xcodebuild test -scheme NuvioTV -sdk iphonesimulator

# Clean build
xcodebuild clean -scheme NuvioTV
```

---

## Troubleshooting Checklist

Before asking for help, check:

- [ ] Verification script passes
- [ ] All files added to Xcode project
- [ ] Target membership set correctly
- [ ] Build folder cleaned
- [ ] Correct simulator selected
- [ ] Swift language version ≥ 5.7
- [ ] iOS deployment target ≥ 15.0

---

## Getting Help

1. Check error message in Xcode
2. Review documentation files
3. Run verification script
4. Check unit tests for examples
5. Review mock repository implementation

---

**Estimated Setup Time**: 5 minutes
**Difficulty**: Easy
**Prerequisites**: Xcode 14+, iOS 15+ SDK

---

*Quick Start Guide - Last Updated: 2026-01-18*
