# Specification: Enhanced Multi-Profile Support

## Overview

This feature enhances the existing user profile system to support household sharing use cases with family-focused capabilities. Each profile will have isolated watch history, personalized "continue watching" queues, individualized recommendations, PIN protection for privacy, and a TV-optimized profile switcher that works seamlessly with remote controls without requiring re-authentication. This brings the application to feature parity with competitors like Netflix and Plex, and lays the foundation for future parental controls.

## Workflow Type

**Type**: feature

**Rationale**: This is new functionality that enhances the existing profile system. While profiles currently exist in the codebase, this task adds substantial new capabilities (watch history isolation, PIN protection, TV-optimized switching, profile-specific recommendations) that constitute feature development rather than refactoring or bug fixes.

## Task Scope

### Services Involved
- **main** (primary) - React Native + TypeScript frontend application with TV platform support
- **Supabase** (integration) - Backend as a service for data persistence (profiles, watch history, preferences)

### This Task Will:
- [ ] Implement profile-level data isolation for watch history and viewing preferences
- [ ] Create profile-specific "continue watching" queues
- [ ] Integrate profile context into recommendation engine
- [ ] Build TV-optimized profile switcher UI component accessible from all screens
- [ ] Add profile customization features (avatars, names)
- [ ] Implement optional PIN protection per profile
- [ ] Ensure profile switching works without re-authentication on TV platforms
- [ ] Add remote control navigation support for profile selection

### Out of Scope:
- Parental control features (ratings restrictions, time limits) - foundation only
- Account-level family management or sub-account billing
- Profile analytics or usage reporting
- Multi-device profile syncing (handled by Supabase)
- Content filtering beyond basic recommendations

## Service Context

### main

**Tech Stack:**
- Language: TypeScript
- Framework: React Native with TV platform support (@react-native-tvos/config-tv)
- Navigation: React Navigation (@react-navigation/native, @react-navigation/bottom-tabs, @react-navigation/native-stack)
- State Management: React Context/Hooks (to be confirmed during implementation)
- Backend: Supabase (authentication, database, realtime)

**Entry Point:** `index.ts`

**How to Run:**
```bash
npm run start
```

**Port:** 3000

**Key Directories:**
- `src/` - Source code
- `app/` - Application code
- `components/` - UI components (profile switcher will live here)

**TV Platform Support:**
- Uses @react-native-tvos/config-tv for tvOS compatibility
- Remote control navigation patterns must follow React Native TV best practices

## Files to Modify

**Note:** Context gathering phase did not identify specific files. During implementation, the following areas will need to be discovered and modified:

| Area | Expected Location | What to Change |
|------|-------------------|----------------|
| Profile data model | `src/types/` or `src/models/` | Add PIN, avatar, preferences fields |
| Authentication context | `src/context/` or `src/providers/` | Add profile switching without logout |
| Watch history tracking | `src/services/` or `src/hooks/` | Add profile_id to all history operations |
| Recommendation engine | `src/services/recommendations/` | Filter recommendations by profile |
| Navigation structure | `app/` or `src/navigation/` | Add profile switcher to all screens |
| Profile management screens | `app/` or `src/screens/` | Add PIN setup, avatar selection |
| Supabase client setup | `src/lib/supabase/` | Add profile-scoped queries |

## Files to Reference

**Note:** Context gathering phase did not identify reference files. During implementation, look for these patterns:

| Pattern Needed | Expected Location | What to Learn |
|----------------|-------------------|---------------|
| TV navigation patterns | Components using `useTVMenuFocus` or similar | How to make profile switcher TV-friendly |
| Modal/bottom sheet patterns | `components/` with BottomSheet usage | How to present profile switcher UI |
| Authentication flow | Auth-related screens/contexts | How current auth works to preserve it |
| Data fetching patterns | Existing Supabase queries | How to add profile filtering |
| Icon/avatar usage | Components with avatar displays | Consistent avatar styling |

## Patterns to Follow

### TV Remote Control Navigation

For TV platform support, profile switcher must:

```typescript
// Expected pattern based on dependencies
import { useTVMenuFocus } from '@react-native-tvos/config-tv';

// Profile switcher should support:
- Focus management for remote control
- Visual focus indicators for selected profile
- Quick navigation between profiles using d-pad
- Confirmation with remote "select" button
```

**Key Points:**
- All interactive elements must be focusable on TV
- Use hasTVPreferredFocus for default selection
- Provide clear visual feedback for focused state
- Test with Apple TV and Android TV remotes

### Data Isolation Pattern

Watch history and preferences must be profile-scoped:

```typescript
// Pattern to implement
interface WatchHistory {
  id: string;
  profile_id: string; // Add this to scope data
  user_id: string;    // Account-level reference
  content_id: string;
  progress: number;
  last_watched: Date;
}

// All queries must filter by current profile
const history = await supabase
  .from('watch_history')
  .select('*')
  .eq('profile_id', currentProfile.id)
  .eq('user_id', user.id);
```

**Key Points:**
- Never expose data across profiles
- All mutations include profile_id
- Queries always filter by active profile
- Account user_id ties profiles to main account

## Requirements

### Functional Requirements

1. **Profile Data Isolation**
   - Description: Each profile maintains separate watch history, continue watching queue, and viewing preferences
   - Acceptance: Viewing content on Profile A does not affect Profile B's watch history or recommendations

2. **Profile Switcher UI**
   - Description: Global profile switcher component accessible from all screens via navigation header or settings menu
   - Acceptance: User can open profile switcher from home, player, search, settings, etc. Switcher displays all profiles with avatars and names

3. **TV-Optimized Profile Selection**
   - Description: Profile switcher fully functional with TV remote control (d-pad navigation, select button)
   - Acceptance: User can navigate between profiles using remote directional buttons and select with remote OK button. Focus indicators clearly show selected profile.

4. **Profile Customization**
   - Description: Users can set profile name and select avatar from predefined set
   - Acceptance: Profile management screen allows editing name (text input) and choosing avatar from gallery

5. **PIN Protection**
   - Description: Optional 4-digit PIN lock for individual profiles to prevent unauthorized access
   - Acceptance: Profile with PIN requires PIN entry before switching. Incorrect PIN shows error. Option to enable/disable PIN per profile.

6. **No Re-Authentication Required**
   - Description: Profile switching does not log user out of account
   - Acceptance: After switching profiles, user remains authenticated to main account. Only profile context changes, not auth session.

7. **Profile-Specific Recommendations**
   - Description: Recommendation engine uses profile's watch history and preferences, not account-wide data
   - Acceptance: Profile A that watches action movies gets action recommendations. Profile B that watches documentaries gets documentary recommendations.

### Edge Cases

1. **Deleted Profile with Active Session** - If active profile is deleted by another device, gracefully switch to default profile or show profile selection
2. **PIN Forgotten** - Account owner can reset any profile PIN via account settings
3. **Empty Profile State** - New profiles with no watch history should show onboarding recommendations
4. **Concurrent Profile Switches** - Handle race conditions if profile switch occurs while content is playing
5. **Offline Profile Data** - Profile context cached locally for offline operation
6. **Maximum Profile Limit** - Enforce maximum number of profiles per account (e.g., 5-7 profiles)

## Implementation Notes

### DO
- Use Supabase RLS (Row Level Security) policies to enforce profile data isolation at database level
- Store profile_id in React Context for easy access across components
- Cache current profile selection locally for quick app restart
- Reuse existing BottomSheet component (@gorhom/bottom-sheet) for profile switcher modal
- Follow React Navigation patterns for adding profile switcher to headers
- Use @expo/vector-icons for avatar placeholder icons
- Test on both iOS/Android mobile AND TV platforms

### DON'T
- Create new authentication flow - profiles are sub-accounts, not separate auth
- Store watch history or preferences in local-only storage - use Supabase for sync
- Make profile switching require network call for every screen navigation (cache active profile)
- Hardcode profile avatar images - use dynamic icon selection
- Break existing TV navigation focus patterns
- Allow profile data leakage in recommendations or continue watching

### Performance Considerations
- Profile switching should be <200ms on cached data
- Lazy load profile avatars if using custom images
- Batch profile preference updates to avoid excessive database writes
- Index profile_id on all relevant database tables

### Security Considerations
- Profile PINs stored hashed in Supabase
- Profile data never exposed via unauthenticated API calls
- RLS policies prevent cross-profile data access even if client bug occurs
- Account owner has override permissions for all profiles

## Development Environment

### Start Services

```bash
# Install dependencies
npm install

# Start development server
npm run start

# For TV simulator (iOS)
npm run ios -- --simulator="Apple TV"

# For TV emulator (Android)
npm run android -- --deviceId=AndroidTV
```

### Service URLs
- Main App: http://localhost:3000
- Expo Dev Tools: http://localhost:19002 (if using Expo CLI)

### Required Environment Variables

From `.env.local`:

```bash
EXPO_PUBLIC_SUPABASE_URL=<your-supabase-url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
EXPO_PUBLIC_USE_REMOTE_CACHE=false
EXPO_PUBLIC_CACHE_SERVER_URL=http://localhost:5173
EXPO_PUBLIC_DISABLE_LOCAL_CACHE=false
EXPO_PUBLIC_MOVIEBOX_PRIMARY_KEY=<key>
EXPO_PUBLIC_MOVIEBOX_TMDB_API_KEY=<key>
EXPO_PUBLIC_TRAKT_CLIENT_ID=<client-id>
EXPO_PUBLIC_TRAKT_CLIENT_SECRET=<secret>
EXPO_PUBLIC_TRAKT_REDIRECT_URI=nuvio-tv://auth/trakt
```

**Profile-Related Setup:**
- Supabase database tables for profiles, watch_history, profile_preferences
- Supabase RLS policies to enforce profile isolation
- Avatar icon set or image assets for profile customization

## Success Criteria

The task is complete when:

1. [ ] Each profile has separate watch history and "continue watching" queue verified in UI
2. [ ] Profile-specific recommendations display different content based on profile's viewing history
3. [ ] Profile switcher is accessible from home, player, search, and settings screens
4. [ ] Profile switcher works with TV remote control (tested on Apple TV or Android TV simulator)
5. [ ] Users can customize profile name and select avatar from options
6. [ ] PIN protection can be enabled on profiles and correctly blocks unauthorized access
7. [ ] Profile switching does not log user out or require re-authentication
8. [ ] No console errors or warnings related to profile functionality
9. [ ] Existing tests still pass (no regressions)
10. [ ] Manual QA verification on both mobile (iOS/Android) and TV platforms

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests

| Test | File | What to Verify |
|------|------|----------------|
| Profile data isolation | `src/__tests__/profiles/isolation.test.ts` | Watch history queries filtered by profile_id |
| Profile context switching | `src/__tests__/context/ProfileContext.test.tsx` | Profile switch updates context correctly |
| PIN validation | `src/__tests__/profiles/pin.test.ts` | PIN hashing and validation logic |
| Profile preference updates | `src/__tests__/profiles/preferences.test.ts` | Preferences saved to correct profile |

### Integration Tests

| Test | Services | What to Verify |
|------|----------|----------------|
| Profile creation flow | main ↔ Supabase | Profile created in database with correct user_id |
| Watch history tracking | main ↔ Supabase | History entries include active profile_id |
| Recommendation filtering | main ↔ Supabase | Recommendations query only active profile's history |
| Profile switching flow | main ↔ Supabase | Profile change loads correct data without re-auth |

### End-to-End Tests

| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Create and switch profiles | 1. Create Profile A 2. Watch content 3. Create Profile B 4. Switch to Profile B 5. Check continue watching | Profile B shows empty continue watching |
| PIN-protected profile | 1. Enable PIN on Profile A 2. Switch to Profile B 3. Attempt switch back to Profile A 4. Enter incorrect PIN 5. Enter correct PIN | Error on incorrect PIN, success on correct PIN |
| TV remote profile selection | 1. Open profile switcher on TV 2. Use d-pad to navigate 3. Press OK to select profile | Profile switches, focus indicators visible |
| Recommendation isolation | 1. Profile A watches action movies 2. Profile B watches documentaries 3. Check home screen recommendations | Each profile shows genre-specific recommendations |

### Browser/TV Verification

| Platform/Component | URL/Location | Checks |
|-------------------|--------------|--------|
| Home Screen | `http://localhost:3000/` (mobile) | Profile switcher icon in header/settings |
| Profile Switcher Modal | Open from home | All profiles listed with avatars, TV focus works |
| Player Screen | While playing content | Profile switcher accessible without stopping playback |
| Profile Management | Settings → Profiles | Can edit name, avatar, enable/disable PIN |
| Continue Watching | Home screen | Only shows current profile's watch history |
| Apple TV Simulator | tvOS simulator | Remote navigation works, focus indicators clear |
| Android TV Emulator | Android TV emulator | Remote navigation works, focus indicators clear |

### Database Verification

| Check | Query/Command | Expected |
|-------|---------------|----------|
| Profile table exists | `SELECT * FROM profiles LIMIT 1;` | Table with columns: id, user_id, name, avatar, pin_hash, created_at |
| Watch history isolation | `SELECT DISTINCT profile_id FROM watch_history WHERE user_id = 'test-user';` | Multiple profile_ids for same user_id |
| RLS policies active | Check Supabase RLS settings | Policies enforce profile_id filtering on SELECT |
| Profile preferences table | `SELECT * FROM profile_preferences LIMIT 1;` | Table with profile_id foreign key |

### QA Sign-off Requirements

**Functional:**
- [ ] All unit tests pass (coverage >80% for new profile code)
- [ ] All integration tests pass
- [ ] All E2E tests pass (mobile and TV)
- [ ] Manual browser/app verification complete on iOS, Android, and TV simulators
- [ ] Database schema verified (tables, indexes, RLS policies)

**Non-Functional:**
- [ ] Profile switching latency <200ms (cached)
- [ ] TV remote navigation feels responsive (no focus lag)
- [ ] No memory leaks when switching profiles repeatedly
- [ ] Offline mode works (cached profile persists)

**Security:**
- [ ] PINs are hashed, not stored plaintext
- [ ] Cross-profile data leakage tests pass (Profile A cannot see Profile B's history)
- [ ] RLS policies tested with direct database queries
- [ ] No sensitive profile data in client-side logs

**Regression:**
- [ ] Existing authentication flow unchanged
- [ ] Non-profile users can still use app normally
- [ ] Existing tests for watch history, recommendations still pass
- [ ] TV navigation on non-profile screens unaffected

**Code Quality:**
- [ ] TypeScript types defined for all profile interfaces
- [ ] Component code follows existing project patterns
- [ ] No hardcoded strings (use i18n if project has it)
- [ ] Code reviewed for TV accessibility (focus management)

**Documentation:**
- [ ] Profile database schema documented
- [ ] Profile context API documented for other developers
- [ ] TV navigation patterns documented for future features
- [ ] User-facing help text for PIN feature added

---

**Implementation Blockers to Resolve First:**
1. Discover existing profile implementation files and data model
2. Locate authentication context to understand session management
3. Find recommendation engine integration points
4. Identify TV navigation patterns in existing codebase
5. Confirm Supabase schema and RLS policy setup approach

**Next Phase:** Exploration and implementation planning to identify specific files and components.
