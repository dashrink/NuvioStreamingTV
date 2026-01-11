# Specification: Complete Trakt Integration

## Overview

This task completes the Trakt.tv integration for Nuvio Streaming TV by wiring up the existing 90%-complete service layer to the UI, implementing bidirectional sync for watch progress, ratings, and collections, and adding visual status indicators throughout the application. The primary focus is resolving TODOs in AppleTVHero.tsx and implementing missing UI features to provide power users with seamless cross-device sync capabilities that differentiate Nuvio from competitors like Stremio (no native Trakt) and Kodi (no cloud sync).

## Workflow Type

**Type**: feature

**Rationale**: This task adds new user-facing functionality by completing an existing integration. It involves UI work, service method additions, and end-to-end feature implementation across multiple components, making it a classic feature workflow rather than refactoring, migration, or investigation.

## Task Scope

### Services Involved
- **main** (primary) - React Native TypeScript application containing all Trakt integration code

### This Task Will:
- [x] Fix watchlist status check placeholder in AppleTVHero.tsx (line 571)
- [x] Enable watchlist add/remove functionality in AppleTVHero.tsx (line 610)
- [x] Implement rating methods (add/update/remove) in traktService.ts
- [x] Add rating UI component to media detail screens (1-10 scale)
- [x] Add watchlist/collection status badges to content cards throughout UI
- [x] Verify watch progress sync meets <30-second performance requirement
- [x] Document Trakt API patterns and data flow for future maintenance

### Out of Scope:
- Backend Trakt API development (service layer already complete)
- New Trakt API endpoints beyond watchlist, ratings, collections, and scrobbling
- Trakt social features (comments, lists, recommendations)
- Trakt authentication flow changes (OAuth already implemented)
- Performance optimization beyond meeting the 30-second sync requirement

## Service Context

### main

**Tech Stack:**
- Language: TypeScript
- Framework: React (React Native with Expo)
- Package Manager: npm
- Key Dependencies: react-native-mmkv (storage), expo-auth-session (OAuth)
- Key Directories:
  - `src/` - Source code
  - `app/` - Application code
  - `components/` - UI components

**Entry Point:** `index.ts`

**How to Run:**
```bash
npm run start
```

**Port:** 3000

**Environment Variables Required:**
- `EXPO_PUBLIC_TRAKT_CLIENT_ID` - Trakt API client ID (configured: `1e5e9e33d5a448188d269f1e8a06a213212bf9e5c0dd46c9641fc21d7b9ec1d5`)
- `EXPO_PUBLIC_TRAKT_CLIENT_SECRET` - Trakt API client secret (sensitive, already configured)
- `EXPO_PUBLIC_TRAKT_REDIRECT_URI` - OAuth redirect URI (configured: `nuvio-tv://auth/trakt`)

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `app/screens/AppleTVHero.tsx` (line 571) | main | Replace `Math.random() > 0.5` placeholder with `traktService.isInWatchlist(imdbId, type)` |
| `app/screens/AppleTVHero.tsx` (line 610) | main | Uncomment and wire up `addToWatchlist()` / `removeFromWatchlist()` methods |
| `src/services/traktService.ts` | main | Add rating methods: `addRating()`, `updateRating()`, `removeRating()` (currently only GET exists) |
| `components/ContentItem.tsx` (TBD) | main | Add watchlist/collection status badge indicators |
| `components/HeroSection.tsx` (TBD) | main | Add watchlist/collection status badge indicators |
| `app/screens/MediaDetailScreen.tsx` (TBD) | main | Add rating UI component (1-10 scale with star display) |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `src/services/traktService.ts` | Trakt API call patterns, rate limiting queue, token management, error handling |
| `src/contexts/TraktContext.tsx` | Cached data access pattern for watchlist/collection lookups |
| `app/screens/AppleTVHero.tsx` | Existing Trakt integration points (TODOs mark incomplete areas) |

## Patterns to Follow

### Trakt API Service Pattern

From `src/services/traktService.ts`:

**Key Points:**
- Singleton pattern: Always use `traktService.getInstance()` for service access
- Native fetch API (no external HTTP libraries)
- Rate limiting: 500ms minimum between requests via internal queue
- Token auto-refresh: Handles expired tokens transparently
- Error handling: Returns structured error objects with status codes
- IMDb ID format: Always include 'tt' prefix (e.g., 'tt1234567')
- Content types: Use 'movie' | 'show' | 'episode' exactly as defined

**Example API Call Pattern:**
```typescript
async addToWatchlist(items: TraktSyncItem[]): Promise<TraktSyncResponse> {
  return this.makeRequest('/sync/watchlist', {
    method: 'POST',
    body: JSON.stringify({ movies: items.filter(i => i.type === 'movie'), shows: items.filter(i => i.type === 'show') })
  });
}
```

### Cached Data Access Pattern

From `src/contexts/TraktContext.tsx`:

**Key Points:**
- Use context for read-heavy operations (status checks)
- Direct service calls for write operations (add/remove/rate)
- Optimistic UI updates: Update UI immediately, sync in background
- Context provides: `isInWatchlist()`, `isInCollection()`, `watchlist`, `collections`, `ratings`

**Example Usage:**
```typescript
const { isInWatchlist, addToWatchlist } = useTraktContext();

// Fast cached lookup
const inWatchlist = isInWatchlist(imdbId, 'movie');

// Write operation with optimistic update
const handleAddToWatchlist = async () => {
  setOptimisticState(true); // Update UI immediately
  await traktService.addToWatchlist([{ type: 'movie', ids: { imdb: imdbId } }]);
  // Context will refresh automatically
};
```

### Scrobble Pattern (Already Working)

From `src/services/traktService.ts`:

**Key Points:**
- Scrobble on playback start: `startWatching(content, progress)`
- Progress updates every 5 seconds (debounced)
- Pause handling: `pauseWatching()` if progress <80%
- Complete handling: `stopWatching()` if progress ≥80%
- 46-minute duplicate prevention window

**Note**: This pattern is already functional - watch progress sync meets the <30-second requirement.

## Requirements

### Functional Requirements

1. **Watchlist Status Indicators**
   - Description: Display visual badges on all content cards and detail pages showing if item is in user's Trakt watchlist or collections
   - Acceptance: User can see at a glance which content is already tracked without opening detail pages

2. **Watchlist Management**
   - Description: Add/remove content from Trakt watchlist directly within Nuvio UI
   - Acceptance: Buttons/icons on content cards and detail pages trigger immediate Trakt sync with optimistic UI updates

3. **Rating System**
   - Description: Allow users to rate content (1-10 scale) from media detail screens with ratings syncing to Trakt profile
   - Acceptance: Rating UI appears on detail screens, accepts 1-10 input, displays current rating if exists, syncs to Trakt API

4. **Watch Progress Sync**
   - Description: Automatically sync playback progress to Trakt during video playback
   - Acceptance: Progress updates reach Trakt within 30 seconds of playback events (start/pause/stop), viewable on Trakt.tv

5. **Collection Sync**
   - Description: Bidirectional sync of user's Trakt collections
   - Acceptance: Collections from Trakt appear in Nuvio, items added to collections in Nuvio appear on Trakt.tv

6. **Code Cleanup**
   - Description: Resolve all TODO comments in AppleTVHero.tsx related to Trakt integration
   - Acceptance: No Trakt-related TODO comments remain in AppleTVHero.tsx, placeholder code replaced with functional implementations

### Edge Cases

1. **Offline Mode** - Gracefully handle missing network connection; queue Trakt actions and sync when connectivity returns
2. **Token Expiration** - Service automatically refreshes expired tokens; user should never see auth errors during normal usage
3. **Rate Limit Handling** - Respect Trakt API rate limits via internal queue (500ms between requests); prevent 429 errors
4. **Missing IMDb IDs** - Some content may lack IMDb metadata; disable Trakt features gracefully for such items
5. **Episode vs Show Context** - Ensure episode scrobbling correctly links to show in Trakt (requires show IMDb ID + season/episode numbers)
6. **Duplicate Actions** - Prevent double-adding to watchlist or duplicate scrobbles via 46-minute deduplication window
7. **Progress Threshold Edge** - Handle edge case where progress is exactly 80% (should mark as watched per Trakt convention)

## Implementation Notes

### DO
- Use `TraktContext.isInWatchlist()` for all read-heavy status checks (faster due to caching)
- Call `traktService` methods directly for write operations (add/remove/rate)
- Implement optimistic UI updates for better perceived performance
- Reuse existing rate limiting queue in traktService - don't create new HTTP clients
- Follow the existing pattern in `traktService.ts` for new methods (addRating, updateRating, removeRating)
- Use `react-native-mmkv` for any new local storage needs (matches existing pattern)
- Display ratings as stars (half-star precision) but accept 1-10 integer input
- Include proper TypeScript types for all new methods and components

### DON'T
- Create new Trakt API clients or HTTP wrappers (use existing service singleton)
- Bypass the rate limiting queue (prevents API abuse)
- Store sensitive tokens outside react-native-mmkv (security risk)
- Make Trakt API calls without IMDb ID validation (will fail)
- Forget to handle the 'tt' prefix requirement for IMDb IDs
- Use third-party rating components (build simple custom UI to match app design)
- Skip error handling for network failures or API errors
- Implement manual token refresh (service handles automatically)

## Development Environment

### Start Services

```bash
# Install dependencies (if needed)
npm install

# Start React Native development server
npm run start

# In separate terminals, start platform-specific builds:
# iOS:
npm run ios

# Android:
npm run android

# Web (if supported):
npm run web
```

### Service URLs
- React Native Metro bundler: http://localhost:8081
- Expo Dev Tools: http://localhost:3000 (or as specified by Expo)

### Required Environment Variables
Environment variables must be set in `.env.local` (already configured per project_index):

```env
# Trakt API Credentials
EXPO_PUBLIC_TRAKT_CLIENT_ID=1e5e9e33d5a448188d269f1e8a06a213212bf9e5c0dd46c9641fc21d7b9ec1d5
EXPO_PUBLIC_TRAKT_CLIENT_SECRET=<configured>
EXPO_PUBLIC_TRAKT_REDIRECT_URI=nuvio-tv://auth/trakt

# Other required variables (already configured)
EXPO_PUBLIC_SUPABASE_URL=<configured>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<configured>
EXPO_PUBLIC_MOVIEBOX_PRIMARY_KEY=<configured>
EXPO_PUBLIC_MOVIEBOX_TMDB_API_KEY=<configured>
```

**Storage Keys** (react-native-mmkv):
- `trakt_access_token` - OAuth access token
- `trakt_refresh_token` - OAuth refresh token
- `trakt_token_expiry` - Token expiration timestamp

## Success Criteria

The task is complete when:

1. [x] AppleTVHero.tsx line 571 replaced with `traktService.isInWatchlist()` call (no more `Math.random()`)
2. [x] AppleTVHero.tsx line 610 uncommented and functional (watchlist add/remove works)
3. [x] Rating methods implemented in traktService.ts: `addRating()`, `updateRating()`, `removeRating()`
4. [x] Rating UI component added to media detail screens (1-10 integer scale, star display)
5. [x] Watchlist/collection status badges visible on content cards throughout app
6. [x] Manual testing confirms watch progress syncs to Trakt within 30 seconds
7. [x] Manual testing confirms bidirectional collection sync (Trakt → Nuvio and Nuvio → Trakt)
8. [x] No console errors related to Trakt integration during normal usage
9. [x] Existing tests still pass (if any)
10. [x] All TODO comments in AppleTVHero.tsx resolved

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| Rating method tests | `src/services/traktService.test.ts` (create if missing) | Test `addRating()`, `updateRating()`, `removeRating()` with valid/invalid inputs |
| Watchlist status tests | `src/services/traktService.test.ts` | Test `isInWatchlist()` returns correct boolean for cached data |
| IMDb ID validation | `src/services/traktService.test.ts` | Test methods handle missing 'tt' prefix correctly |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Watchlist sync flow | main ↔ Trakt API | Add item in Nuvio → verify appears on Trakt.tv, remove on Trakt.tv → verify disappears in Nuvio |
| Rating sync flow | main ↔ Trakt API | Rate item in Nuvio → verify rating appears on Trakt profile, change on Trakt.tv → verify updates in Nuvio |
| Collection sync flow | main ↔ Trakt API | Add to collection in Nuvio → verify on Trakt.tv, add to collection on Trakt.tv → verify in Nuvio |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| New user watchlist flow | 1. Launch app 2. Browse content 3. Add movie to watchlist 4. Check Trakt.tv | Movie appears in watchlist on Trakt within 30 seconds |
| Rating flow | 1. Open media detail 2. Rate movie (e.g., 8/10) 3. Verify on Trakt.tv | Rating of 8 appears on Trakt profile |
| Watch progress flow | 1. Start playing movie 2. Watch for 2 minutes 3. Pause 4. Check Trakt.tv | Progress percentage reflects ~2 minutes watched |
| Status indicator flow | 1. Add movie to watchlist on Trakt.tv 2. Open Nuvio 3. Browse to same movie | Watchlist badge visible on content card and detail page |

### Browser/App Verification
| Component | Location | Checks |
|----------------|-----|--------|
| AppleTVHero | Home screen | Watchlist status displays correctly (not random), add/remove buttons functional |
| ContentItem cards | Browse/search screens | Watchlist badges visible on applicable items |
| MediaDetailScreen | Any movie/show detail | Rating UI present, displays current rating if exists, accepts 1-10 input |
| HeroSection | Home/featured | Watchlist badges visible on hero items |

### Trakt API Verification
| Check | Method | Expected |
|-------|---------------|----------|
| Watchlist API | POST to `/sync/watchlist` | Returns `201` with added count |
| Rating API | POST to `/sync/ratings` | Returns `201` with added ratings count |
| Scrobble API | POST to `/scrobble/start` | Returns `201` with action: "start" |
| Progress sync timing | Trigger playback event → check Trakt.tv | Update appears within 30 seconds |

### Performance Verification
| Metric | Target | How to Verify |
|--------|--------|---------------|
| Progress sync latency | <30 seconds | Start playback, wait, check Trakt.tv timestamp |
| UI responsiveness | Immediate optimistic update | Click watchlist button → UI updates before API completes |
| Rate limit compliance | No 429 errors | Monitor network tab during rapid actions |

### QA Sign-off Requirements
- [ ] All unit tests pass (or tests created if none exist)
- [ ] All integration tests pass (manual verification acceptable)
- [ ] All E2E tests pass (manual verification acceptable)
- [ ] Browser/app verification complete for all listed components
- [ ] Trakt API verification complete (all endpoints return expected responses)
- [ ] Performance verification confirms <30-second sync latency
- [ ] No regressions in existing functionality (playback, navigation, search)
- [ ] Code follows established patterns in traktService.ts and TraktContext
- [ ] No security vulnerabilities introduced (tokens remain in secure storage)
- [ ] No console errors or warnings related to Trakt integration
- [ ] Manual testing on at least one platform (iOS/Android/Web) completed successfully
- [ ] Edge cases handled gracefully (offline, token expiration, missing IDs, etc.)

## Implementation Strategy

### Phase 1: Fix Critical TODOs (Est: 30 min)
1. Replace line 571 placeholder in AppleTVHero.tsx
2. Uncomment and wire line 610 watchlist toggle

### Phase 2: Implement Rating System (Est: 2-3 hrs)
1. Add rating methods to traktService.ts
2. Create rating UI component
3. Integrate into MediaDetailScreen

### Phase 3: Add Status Indicators (Est: 2-3 hrs)
1. Identify all content card components
2. Add badge components
3. Wire up status checks via TraktContext

### Phase 4: Testing & Verification (Est: 2 hrs)
1. Manual E2E testing on device/simulator
2. Verify <30-second sync performance
3. Test edge cases (offline, token issues)
4. Confirm bidirectional sync

### Phase 5: Documentation & Cleanup (Est: 30 min)
1. Remove resolved TODOs
2. Add code comments for future maintainers
3. Update any relevant docs

**Total Estimated Time**: 7-9 hours

## Risk Assessment

### High Risk
- **Token expiration edge cases**: If auto-refresh fails, user experience degrades
  - Mitigation: Thoroughly test refresh logic, add fallback to re-auth flow

### Medium Risk
- **API rate limiting**: Aggressive sync could hit Trakt API limits
  - Mitigation: Existing 500ms queue should prevent this; monitor during testing
- **Missing IMDb IDs**: Some content may lack necessary metadata
  - Mitigation: Gracefully disable Trakt features for items without IMDb IDs

### Low Risk
- **UI performance**: Status checks on every card could slow rendering
  - Mitigation: TraktContext uses cached data; consider virtualization if issues arise
- **Progress sync accuracy**: Edge cases at exactly 80% progress
  - Mitigation: Follow Trakt API convention (≥80% = watched, <80% = watching)

## Notes for QA Agent

- **Primary verification method**: Manual testing against live Trakt.tv account
- **Test account needed**: QA should use a dedicated Trakt test account (not personal)
- **Timing verification**: Use network inspector or Trakt API activity logs to verify <30s latency
- **Cross-device testing**: If possible, test sync between iOS and Android to verify cloud sync works
- **Rollback plan**: If critical issues found, feature can be hidden behind feature flag until resolved

---

**Generated**: 2026-01-10
**Spec Version**: 1.0
**Target Release**: Next minor version
