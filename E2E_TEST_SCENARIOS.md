# End-to-End Test Scenarios
## NuvioTV Native Applications

**Document Version:** 1.0
**Date:** January 2026
**Purpose:** Comprehensive E2E test scenarios for manual and automated testing

---

## Test Scenario Format

Each scenario includes:
- **ID**: Unique identifier
- **Priority**: P0 (Critical), P1 (High), P2 (Medium), P3 (Low)
- **Platforms**: Android Mobile, Android TV, iPhone, iPad, Apple TV
- **Prerequisites**: Required setup
- **Steps**: Detailed test steps
- **Expected Results**: What should happen
- **Actual Results**: (To be filled during testing)
- **Status**: Pass/Fail

---

## Category 1: Content Discovery

### E2E-CD-001: Home Screen Initial Load
**Priority**: P0
**Platforms**: All
**Prerequisites**: Fresh app install or cleared cache

**Test Steps:**
1. Launch the NuvioTV app
2. Observe the home screen loading process
3. Wait for content to populate

**Expected Results:**
- Home screen loads within 1.5s (Android) or 1.0s (iOS)
- Hero carousel appears with featured content
- At least 3 catalog sections visible (Trending, Popular, etc.)
- Continue watching section visible (if user has watch history)
- No errors displayed
- Smooth loading animations

**Automation Notes:**
- iOS: Covered by `HomeScreenUITests.testHomeScreenLoadsContent()`
- Android: Needs UI test implementation

---

### E2E-CD-002: Browse Catalog Content
**Priority**: P0
**Platforms**: All
**Prerequisites**: App launched, home screen visible

**Test Steps:**
1. Tap/Click on any catalog section (e.g., "Trending Movies")
2. Observe catalog browse screen loading
3. Scroll down to trigger pagination
4. Select a content item

**Expected Results:**
- Catalog browse screen opens immediately
- Grid layout displays properly for device type
  - Android TV: 6 columns
  - iPad: 4-5 columns
  - iPhone: 2-3 columns
- Initial content loads within 1s
- Pagination triggers at 80% scroll
- Next page loads within 0.8s
- Tapping item navigates to details screen

**Automation Notes:**
- iOS: Covered by `CatalogBrowseUITests` and `EndToEndFlowTests`
- Android: Needs E2E implementation

---

### E2E-CD-003: Filter and Sort Content
**Priority**: P1
**Platforms**: All
**Prerequisites**: Catalog browse screen open

**Test Steps:**
1. Open the filter menu
2. Select a genre filter (e.g., "Action")
3. Observe content update
4. Open sort menu
5. Select a sort option (e.g., "Top Rated")
6. Observe content re-sort
7. Combine filters (genre + year + sort)

**Expected Results:**
- Filter menu opens smoothly
- Genre filter applies within 0.5s
- Content updates to show only filtered items
- Sort menu opens smoothly
- Sort order changes immediately
- Combined filters work correctly
- Filter state persists on back navigation

**Automation Notes:**
- iOS: Covered by `CatalogBrowseUITests.testGenreFilter()` and `testSortOptions()`
- Android: Needs UI test

---

### E2E-CD-004: Search for Content
**Priority**: P1
**Platforms**: All
**Prerequisites**: App launched

**Test Steps:**
1. Navigate to search screen
2. Enter search query "Breaking Bad"
3. Wait for results
4. Filter results by content type (Series)
5. Select a result

**Expected Results:**
- Search input is responsive
- Results appear as user types
- Results populate within 1s of query completion
- Filter by content type works
- Selecting result navigates to details screen
- Search history is saved

**Automation Notes:**
- iOS: Needs test implementation
- Android: Needs test implementation

---

## Category 2: Content Details & Metadata

### E2E-DM-001: View Content Details
**Priority**: P0
**Platforms**: All
**Prerequisites**: Content item selected

**Test Steps:**
1. Navigate to details screen (from home, catalog, or search)
2. Observe details loading
3. Scroll through content sections
4. View cast and crew
5. Check ratings and metadata

**Expected Results:**
- Details screen loads within 1s
- Backdrop/poster images load properly
- Title, description, and metadata visible
- Cast section displays with photos
- Ratings displayed (if available)
- Action buttons visible (Play, Watchlist, Rate, Share)
- Related content section visible
- Smooth scrolling

**Automation Notes:**
- iOS: Covered by `DetailsScreenUITests.testDetailsScreenLoads()`
- Android: Needs UI test

---

### E2E-DM-002: Manage Watchlist
**Priority**: P1
**Platforms**: All
**Prerequisites**: Details screen open

**Test Steps:**
1. Tap "Add to Watchlist" button
2. Observe button state change
3. Navigate to library/watchlist screen
4. Verify item appears in watchlist
5. Return to details screen
6. Tap "Remove from Watchlist"
7. Verify removal in library

**Expected Results:**
- Watchlist button toggles immediately
- Visual feedback on add/remove
- Item appears in watchlist within 1s
- Item persists across app restarts
- Remove operation is immediate
- Watchlist syncs across devices (if implemented)

**Automation Notes:**
- iOS: Covered by `DetailsScreenUITests.testWatchlistToggle()`
- Android: Needs implementation

---

### E2E-DM-003: TV Series Episode Selection
**Priority**: P0
**Platforms**: All (especially important for TV)
**Prerequisites**: TV series details screen open

**Test Steps:**
1. View series details
2. Navigate to seasons/episodes section
3. Select a different season
4. Select an episode
5. Observe episode details
6. Play episode

**Expected Results:**
- Seasons list displayed
- Switching seasons updates episode list
- Episode grid/list displays properly
- Episode metadata visible (title, description, thumbnail)
- Episode selection updates details
- Play button initiates playback

**Automation Notes:**
- iOS: Needs test implementation
- Android: Needs test implementation

---

## Category 3: Video Playback

### E2E-VP-001: Basic Video Playback
**Priority**: P0
**Platforms**: All
**Prerequisites**: Details screen open with available streams

**Test Steps:**
1. Tap "Play" button
2. Observe stream selection (if multiple sources)
3. Select a stream
4. Wait for player initialization
5. Observe video playback
6. Verify controls appear/disappear
7. Pause and resume playback
8. Exit player

**Expected Results:**
- Stream selection modal appears (if multiple sources)
- Stream loads within 2s
- Video begins playing automatically
- Controls visible on initial load
- Controls auto-hide after 5s
- Tap/click shows controls
- Pause/resume works immediately
- Back navigation stops playback

**Automation Notes:**
- iOS: Needs player integration test
- Android: Needs player UI test

---

### E2E-VP-002: Player Controls and Features
**Priority**: P0
**Platforms**: All
**Prerequisites**: Video playing

**Test Steps:**
1. Test play/pause button
2. Test seek bar (scrubbing)
3. Test forward/backward skip (10s)
4. Change audio track
5. Enable subtitles
6. Change subtitle track
7. Adjust playback speed
8. Test volume control
9. Toggle fullscreen (mobile)

**Expected Results:**
- All controls are responsive (< 100ms)
- Seek bar updates in real-time
- Skip buttons work (10s forward/back)
- Audio track selection works
- Subtitles appear correctly
- Subtitle sync is accurate
- Playback speed changes smoothly (0.5x, 1.0x, 1.5x, 2.0x)
- Volume adjusts properly
- Fullscreen toggle works (mobile)

**Automation Notes:**
- iOS: Needs comprehensive player test
- Android: PlayerViewModel tested, UI test needed

---

### E2E-VP-003: Intro Skip and Next Episode
**Priority**: P1
**Platforms**: All (especially Android with intro detection)
**Prerequisites**: TV series episode playing

**Test Steps:**
1. Play episode with intro
2. Wait for intro skip button
3. Tap skip intro
4. Watch until near end of episode
5. Observe next episode prompt
6. Tap "Play Next"

**Expected Results:**
- Skip intro button appears at correct time
- Skip intro jumps to correct timestamp
- Next episode prompt appears 30s before end
- Countdown to auto-play next episode
- Tapping "Play Next" immediately starts next episode
- Watch progress saves for current episode

**Automation Notes:**
- Android: Intro skip logic tested in PlayerViewModel
- iOS: Needs implementation and testing

---

### E2E-VP-004: Resume Playback
**Priority**: P0
**Platforms**: All
**Prerequisites**: Previous partial watch of content

**Test Steps:**
1. Play content and watch for 5 minutes
2. Exit player
3. Navigate away from app
4. Return to app
5. Navigate to same content
6. Tap play

**Expected Results:**
- Resume overlay appears
- Shows saved timestamp
- "Resume" and "Restart" options visible
- Selecting "Resume" continues from saved position
- Selecting "Restart" begins from start
- Progress bar reflects saved position

**Automation Notes:**
- iOS: Needs test
- Android: PlayerRepository tested, UI test needed

---

## Category 4: Profile Management

### E2E-PM-001: Create New Profile
**Priority**: P1
**Platforms**: All
**Prerequisites**: App installed

**Test Steps:**
1. Open profile selector
2. Tap "Add Profile"
3. Enter profile name "TestUser"
4. Select avatar
5. Choose profile type (Standard/Kids)
6. Set PIN (if enabled)
7. Save profile

**Expected Results:**
- Profile creation modal opens
- Name input is responsive
- Avatar selection grid displays
- Profile type toggle works
- PIN setup modal appears (if enabled)
- Profile saves successfully
- New profile appears in selector
- Profile persists across app restarts

**Automation Notes:**
- Android: ProfileManager integration tested
- iOS: Needs ProfileManager integration + UI test

---

### E2E-PM-002: Switch Profiles
**Priority**: P1
**Platforms**: All
**Prerequisites**: Multiple profiles exist

**Test Steps:**
1. Open profile selector
2. Select different profile
3. Enter PIN (if protected)
4. Observe home screen update
5. Check watch history
6. Check watchlist

**Expected Results:**
- Profile selector shows all profiles
- PIN prompt appears for protected profiles
- Correct PIN unlocks profile
- Incorrect PIN shows error
- Home screen updates with profile-specific data
- Watch history is profile-specific
- Watchlist is profile-specific

**Automation Notes:**
- Android: ProfileManager tested, UI flow needed
- iOS: Needs implementation + test

---

### E2E-PM-003: PIN Protection
**Priority**: P1
**Platforms**: All
**Prerequisites**: Profile with PIN enabled

**Test Steps:**
1. Switch to PIN-protected profile
2. Enter incorrect PIN
3. Observe error
4. Enter correct PIN
5. Verify access granted
6. Test "Forgot PIN" flow

**Expected Results:**
- PIN entry screen appears
- Incorrect PIN shows error message
- Error clears on re-entry
- Correct PIN grants access
- Forgot PIN shows recovery options
- Master PIN can reset profile PIN

**Automation Notes:**
- Android: PIN logic tested in ProfileManager
- iOS: Needs implementation

---

## Category 5: Settings & Preferences

### E2E-SP-001: Change App Settings
**Priority**: P2
**Platforms**: All
**Prerequisites**: App running

**Test Steps:**
1. Navigate to Settings
2. Change theme (Dark/Light)
3. Change playback quality preference
4. Toggle auto-play next episode
5. Change subtitle language preference
6. Exit settings

**Expected Results:**
- Settings screen accessible
- Theme changes apply immediately
- Playback preferences save
- Auto-play toggle updates
- Subtitle language persists
- Settings survive app restart

**Automation Notes:**
- iOS: Needs test
- Android: Needs test

---

### E2E-SP-002: Trakt Integration
**Priority**: P2
**Platforms**: All
**Prerequisites**: Trakt account

**Test Steps:**
1. Navigate to Trakt settings
2. Connect Trakt account
3. Authorize app
4. Watch content
5. Verify watch history syncs to Trakt
6. Check scrobbling
7. Disconnect Trakt

**Expected Results:**
- Trakt connection flow works
- Authorization redirects properly
- Account connects successfully
- Watch progress syncs to Trakt
- Scrobbling works in real-time
- Disconnect removes authorization

**Automation Notes:**
- Requires mock Trakt API for automation
- Manual testing recommended

---

## Category 6: Platform-Specific Features

### E2E-PS-001: Android TV D-pad Navigation
**Priority**: P0
**Platform**: Android TV only
**Prerequisites**: Android TV device with remote

**Test Steps:**
1. Navigate home screen with D-pad
2. Move through catalog items
3. Enter details screen
4. Navigate player controls with D-pad
5. Test back button behavior

**Expected Results:**
- D-pad navigation is smooth
- Focus highlights are visible
- Focus order is logical
- Focus restoration on back navigation
- All UI elements are focusable
- Remote controls work in player

**Automation Notes:**
- Manual testing required
- Focus management tested in unit tests

---

### E2E-PS-002: Apple TV Focus Engine
**Priority**: P0
**Platform**: Apple TV only
**Prerequisites**: Apple TV with remote

**Test Steps:**
1. Navigate home screen with remote
2. Use focus engine to browse
3. Test focus groups
4. Navigate player with Siri remote
5. Test gesture controls

**Expected Results:**
- Focus engine works smoothly
- Focus groups are logical
- Swipe gestures work properly
- Siri remote gestures functional
- All clickable elements focusable

**Automation Notes:**
- Manual testing required
- tvOS-specific UI tests needed

---

### E2E-PS-003: iPad Split View
**Priority**: P2
**Platform**: iPad only
**Prerequisites**: iPad running iPadOS

**Test Steps:**
1. Open app in full screen
2. Enable split view with another app
3. Resize split view
4. Navigate within app
5. Test playback in split view

**Expected Results:**
- App adapts to split view
- Layout adjusts to available space
- Navigation remains functional
- Video playback works in split view
- Orientation changes handled

**Automation Notes:**
- Manual testing recommended

---

### E2E-PS-004: Picture-in-Picture (iOS)
**Priority**: P2
**Platform**: iOS/iPadOS only
**Prerequisites**: iOS device, video playing

**Test Steps:**
1. Start video playback
2. Exit app to home screen
3. Observe PiP activation
4. Resize PiP window
5. Return to app
6. Dismiss PiP

**Expected Results:**
- PiP activates automatically on exit
- Video continues playing
- PiP window is draggable
- Resizing works
- Returning to app dismisses PiP
- Playback continues seamlessly

**Automation Notes:**
- Manual testing recommended

---

## Category 7: Offline & Network Scenarios

### E2E-ON-001: Poor Network Handling
**Priority**: P1
**Platforms**: All
**Prerequisites**: Ability to control network

**Test Steps:**
1. Start app on WiFi
2. Navigate to catalog
3. Switch to slow mobile data (or throttle)
4. Observe loading behavior
5. Attempt to play content
6. Restore network

**Expected Results:**
- App shows loading indicators
- Timeouts are reasonable (10s)
- Error messages are helpful
- Retry options available
- App doesn't crash
- Recovery on network restore

**Automation Notes:**
- Requires network condition simulation
- Manual testing recommended

---

### E2E-ON-002: Offline Mode (if supported)
**Priority**: P2
**Platforms**: All
**Prerequisites**: Downloaded content available

**Test Steps:**
1. Download content while online
2. Enable airplane mode
3. Navigate to downloads
4. Play downloaded content
5. Restore network
6. Verify sync

**Expected Results:**
- Downloaded content accessible offline
- Playback works without network
- Download list shows all items
- Network restore triggers sync
- Watch progress syncs

**Automation Notes:**
- Only if offline feature is implemented

---

## Category 8: Error Handling & Edge Cases

### E2E-EH-001: Handle No Content Available
**Priority**: P2
**Platforms**: All
**Prerequisites**: Content with no streams

**Test Steps:**
1. Select content with no available streams
2. Observe details screen
3. Attempt to play

**Expected Results:**
- Details screen loads normally
- "No streams available" message displayed
- Play button disabled or shows helpful message
- User can still add to watchlist
- Navigation remains functional

**Automation Notes:**
- Needs mock data with no streams

---

### E2E-EH-002: Handle Playback Errors
**Priority**: P1
**Platforms**: All
**Prerequisites**: Ability to trigger playback error

**Test Steps:**
1. Attempt to play invalid stream
2. Observe error handling
3. Try alternative stream
4. Test retry functionality

**Expected Results:**
- Error modal/overlay appears
- Error message is user-friendly
- Retry option available
- Alternative streams suggested
- App doesn't crash
- User can exit gracefully

**Automation Notes:**
- Requires mock stream errors

---

### E2E-EH-003: App Backgrounding & Restoration
**Priority**: P1
**Platforms**: All
**Prerequisites**: App running

**Test Steps:**
1. Navigate to details screen
2. Background app
3. Wait 5 minutes
4. Restore app
5. Verify state

**Expected Results:**
- App restores to same screen
- State is preserved
- Network reconnection handled
- Video playback resumes (if applicable)
- No crashes on restore

**Automation Notes:**
- Platform-specific lifecycle testing

---

## Category 9: Accessibility

### E2E-AC-001: VoiceOver Support (iOS)
**Priority**: P2
**Platform**: iOS only
**Prerequisites**: VoiceOver enabled

**Test Steps:**
1. Enable VoiceOver
2. Navigate home screen
3. Browse catalog
4. Navigate to details
5. Attempt playback

**Expected Results:**
- All UI elements have labels
- Navigation is logical
- Buttons announce correctly
- Hint text is helpful
- Player controls are accessible

**Automation Notes:**
- Manual testing required

---

### E2E-AC-002: TalkBack Support (Android)
**Priority**: P2
**Platform**: Android only
**Prerequisites**: TalkBack enabled

**Test Steps:**
1. Enable TalkBack
2. Navigate home screen
3. Browse catalog
4. Navigate to details
5. Attempt playback

**Expected Results:**
- All UI elements have content descriptions
- Navigation is logical
- Buttons announce correctly
- Player controls accessible

**Automation Notes:**
- Manual testing required

---

## Category 10: Performance & Stress Testing

### E2E-PT-001: Large Dataset Handling
**Priority**: P2
**Platforms**: All
**Prerequisites**: Large catalog (1000+ items)

**Test Steps:**
1. Browse catalog with 1000+ items
2. Scroll rapidly
3. Apply filters
4. Measure memory usage
5. Check frame rate

**Expected Results:**
- Smooth scrolling maintained (60 FPS)
- Memory usage stable (< 200MB)
- No memory leaks
- Filter performance acceptable
- App remains responsive

**Automation Notes:**
- iOS: PerformanceTests cover some scenarios
- Profiling tools needed

---

### E2E-PT-002: Rapid Navigation Stress Test
**Priority**: P2
**Platforms**: All
**Prerequisites**: App running

**Test Steps:**
1. Rapidly navigate between screens
2. Quickly switch tabs/sections
3. Rapidly scroll lists
4. Start/stop playback repeatedly
5. Switch profiles rapidly

**Expected Results:**
- App remains stable
- No crashes
- UI remains responsive
- Transitions are smooth
- Memory doesn't balloon

**Automation Notes:**
- iOS: EndToEndFlowTests include stress tests
- Android: Needs implementation

---

## Test Execution Checklist

### Pre-Testing Setup
- [ ] Test environments configured (Android emulator, iOS simulator, devices)
- [ ] Test data prepared (accounts, content, profiles)
- [ ] Network simulation tools ready (if needed)
- [ ] Screen recording tools ready
- [ ] Bug tracking system ready

### Android Testing
- [ ] Android Mobile (Phone)
- [ ] Android Mobile (Tablet)
- [ ] Android TV

### iOS Testing
- [ ] iPhone (Compact)
- [ ] iPad (Regular)
- [ ] Apple TV

### Test Execution
- [ ] P0 tests completed
- [ ] P1 tests completed
- [ ] P2 tests completed
- [ ] P3 tests completed
- [ ] Platform-specific tests completed
- [ ] Accessibility tests completed
- [ ] Performance tests completed

### Post-Testing
- [ ] Bugs logged and prioritized
- [ ] Test results documented
- [ ] Pass/Fail rates calculated
- [ ] Regression testing completed
- [ ] Sign-off obtained

---

## Test Coverage Matrix

| Category | Android Mobile | Android TV | iPhone | iPad | Apple TV | Status |
|----------|----------------|------------|--------|------|----------|--------|
| Content Discovery | ⚠️ | ⚠️ | ✅ | ⚠️ | ⚠️ | Partial |
| Details & Metadata | ⚠️ | ⚠️ | ✅ | ⚠️ | ⚠️ | Partial |
| Video Playback | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | Low |
| Profile Management | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | Low |
| Settings | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | Low |
| Platform-Specific | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | Manual |
| Offline & Network | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | Manual |
| Error Handling | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | Low |
| Accessibility | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | Manual |
| Performance | ⚠️ | ⚠️ | ✅ | ⚠️ | ⚠️ | Partial |

**Legend:**
- ✅ Good coverage (60%+)
- ⚠️ Partial coverage or manual only
- ❌ No coverage

---

## Automation Recommendations

### Priority 1: Critical Path Automation
1. Home screen load and catalog display
2. Content browsing and filtering
3. Details screen display
4. Basic video playback
5. Profile switching

### Priority 2: Common Flows
1. Search functionality
2. Watchlist management
3. Episode selection (series)
4. Resume playback
5. Settings changes

### Priority 3: Edge Cases
1. Error handling
2. Network scenarios
3. Large datasets
4. Rapid navigation

### Tools Recommended
- **Android**: Espresso + Compose UI Test, Maestro for E2E
- **iOS**: XCUITest (already in use), Maestro for E2E alternative
- **Cross-platform**: Maestro or Appium for unified E2E tests

---

## Conclusion

This document provides comprehensive E2E test scenarios covering all critical user journeys across all platforms. The scenarios are designed to be executed manually or adapted for automation frameworks.

**Next Steps:**
1. Review and prioritize scenarios
2. Implement missing automated tests
3. Schedule manual testing sessions
4. Execute tests and document results
5. Log bugs and track to resolution
6. Repeat until release criteria met

**Document Status:** FINAL
**Maintenance:** Update as features change
**Contact:** QA Team / Development Team
