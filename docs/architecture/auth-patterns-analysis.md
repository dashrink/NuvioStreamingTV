# Authentication & Session Management Patterns Analysis

**Document Version:** 1.0
**Last Updated:** 2026-01-13
**Project:** NuvioStreamingTV React Native App
**Purpose:** Comprehensive analysis of authentication flows, session management, and profile systems with recommendations for Rust core migration.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Authentication Architecture Overview](#authentication-architecture-overview)
3. [Session Storage & MMKV Implementation](#session-storage--mmkv-implementation)
4. [Profile Management System](#profile-management-system)
5. [Security Patterns](#security-patterns)
6. [Authentication Flow Diagrams](#authentication-flow-diagrams)
7. [State Synchronization](#state-synchronization)
8. [Migration Strategy: Rust Core vs Native Layer](#migration-strategy-rust-core-vs-native-layer)
9. [Recommendations](#recommendations)

---

## Executive Summary

The NuvioStreamingTV application implements a **multi-layered authentication and profile management system** designed for a TV-first, multi-user streaming experience. Currently, traditional cloud authentication (Supabase) is **disabled**, and the app operates in **local/guest mode** with sophisticated profile isolation.

### Key Components

| Component | Type | Storage | Purpose |
|-----------|------|---------|---------|
| **AccountContext** | React Context | MMKV | User authentication state management |
| **ProfileContext** | React Context | MMKV | Multi-profile management |
| **AccountService** | Singleton Service | MMKV | Authentication operations (currently disabled) |
| **ProfileService** | Singleton Service | MMKV | CRUD operations for user profiles |
| **PinService** | Singleton Service | MMKV | PIN protection with SHA-256 hashing |
| **mmkvStorage** | Singleton Storage | Native MMKV | Native key-value storage with in-memory cache |

### Authentication State

- **Cloud Auth:** Currently DISABLED due to "upcoming system changes" (per code comments)
- **Local Mode:** Active - using scoped storage with profile isolation
- **User Scope:** Stored as `@user:current` (defaults to `'local'`)
- **Session Persistence:** Native MMKV storage with 30-second in-memory cache
- **Multi-Profile:** Up to 5 profiles per device with PIN protection

### Critical Metrics

- **Storage Keys:** 10+ authentication-related keys (user data, profiles, PINs, attempts)
- **Session Timeout:** None (local mode persists indefinitely)
- **PIN Security:** SHA-256 hashing with random salts, 3-5 max attempts
- **Lockout Durations:** Progressive (30s, 60s, 300s)
- **Cache Strategy:** 30-second TTL, LRU eviction, max 100 entries

---

## Authentication Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     React Native UI Layer                        │
│  Components: AuthScreen, ProfilesScreen, SettingsScreen         │
└─────────────────┬───────────────────────────────────────────────┘
                  │ useAccount(), useProfileContext()
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Context Provider Layer                        │
│                                                                  │
│  AccountContext:                                                 │
│  ├── user: AuthUser | null                                       │
│  ├── loading: boolean                                            │
│  ├── signIn(email, password) → disabled                          │
│  ├── signUp(email, password) → disabled                          │
│  ├── signOut() → clears user data                               │
│  ├── refreshCurrentUser() → loads from storage                   │
│  └── updateProfile(partial) → updates avatar/displayName        │
│                                                                  │
│  ProfileContext:                                                 │
│  ├── profiles: Profile[] (up to 5)                              │
│  ├── activeProfile: Profile | null                              │
│  ├── isLoading: boolean                                          │
│  ├── loadProfiles() → from MMKV                                 │
│  ├── setActiveProfile(id) → switches active                     │
│  └── getActiveProfileId() → returns current profile ID          │
└─────────────────┬───────────────────────────────────────────────┘
                  │ Service method calls
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Service Layer                               │
│                                                                  │
│  accountService (Singleton):                                     │
│  ├── signUpWithEmail() → DISABLED (returns error)               │
│  ├── signInWithEmail() → DISABLED (returns error)               │
│  ├── signOut() → clears @user:data, sets scope to 'local'       │
│  ├── getCurrentUser() → reads from MMKV                         │
│  ├── updateProfile() → updates user object                      │
│  └── getCurrentUserIdScoped() → returns user.id or 'local'      │
│                                                                  │
│  profileService (Singleton):                                     │
│  ├── getProfiles() → with in-memory cache                       │
│  ├── getActiveProfile() → reads active profile ID               │
│  ├── createProfile() → max 5 profiles, auto-admin first         │
│  ├── updateProfile() → name, avatar, preferences                │
│  ├── deleteProfile() → auto-promotes admin, min 1 profile       │
│  └── setActiveProfile() → switches current profile              │
│                                                                  │
│  pinService (Singleton):                                         │
│  ├── setPin() → SHA-256 hash with random salt                   │
│  ├── verifyPin() → compare hashes, track attempts               │
│  ├── hasPin() → check if profile is PIN-protected              │
│  ├── removePin() → remove PIN protection                        │
│  ├── changePin() → verify old, set new                          │
│  └── getLockoutInfo() → check lockout status                    │
└─────────────────┬───────────────────────────────────────────────┘
                  │ Storage operations
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                   MMKV Native Storage Layer                      │
│                                                                  │
│  mmkvStorage (Singleton):                                        │
│  ├── Native MMKV (react-native-mmkv)                            │
│  ├── In-memory cache: Map<key, {value, timestamp}>              │
│  ├── Cache TTL: 30 seconds                                       │
│  ├── Max cache size: 100 entries (LRU eviction)                 │
│  ├── AsyncStorage-compatible API                                │
│  └── Direct MMKV methods for performance                        │
│                                                                  │
│  Storage Keys:                                                   │
│  ├── @user:data → AuthUser JSON                                 │
│  ├── @user:current → scope ('local' or user.id)                 │
│  ├── user_profiles → Profile[] JSON                             │
│  ├── @profile:activeProfileId → active profile ID               │
│  ├── @profile:pin:{profileId} → {salt, hash} JSON               │
│  └── @profile:pin_attempts:{profileId} → attempt tracking       │
└─────────────────────────────────────────────────────────────────┘
```

### Authentication State Machine

```
┌──────────────┐
│  App Start   │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────┐
│  AccountContext.useEffect()          │
│  Loads user from MMKV                │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  accountService.getCurrentUser()     │
│  Reads @user:data from MMKV          │
└──────┬───────────────────────────────┘
       │
       ├─► User exists → setUser(u)
       │                 loading = false
       │                 Navigate to ProfilesScreen
       │
       └─► No user → setUser(null)
                     loading = false
                     Stay in guest/local mode

┌──────────────────────────────────────┐
│  ProfileContext Parallel Init        │
│  Loads profiles from MMKV            │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  profileService.loadProfiles()       │
│  Reads 'user_profiles' from MMKV     │
└──────┬───────────────────────────────┘
       │
       ├─► Profiles exist → setProfiles(parsed)
       │                    Find active profile
       │                    setActiveProfile(active)
       │
       └─► No profiles → Empty state
                         User creates first profile
                         Auto-set as admin
```

---

## Session Storage & MMKV Implementation

### MMKV Storage Architecture

**File:** `src/services/mmkvStorage.ts`

The application uses **MMKV** (Memory Mapped Key-Value store) from `react-native-mmkv` for all persistent storage. This is a high-performance native storage solution with several advantages over AsyncStorage:

#### MMKV Characteristics

| Feature | Implementation | Purpose |
|---------|---------------|---------|
| **Native Bridge** | C++ implementation, direct native access | 10-100x faster than AsyncStorage |
| **In-Memory Cache** | Map<key, {value, timestamp}> | Reduces native bridge calls |
| **Cache TTL** | 30 seconds | Balance freshness vs performance |
| **LRU Eviction** | Max 100 entries | Prevent memory bloat |
| **Synchronous API** | `getString()`, `setString()` available | Optional sync access for critical paths |
| **Type Safety** | getString, getNumber, getBoolean | Avoid JSON parsing overhead |

#### MMKV Storage Implementation

```typescript
// Singleton pattern with in-memory cache
class MMKVStorage {
  private storage = createMMKV();
  private cache = new Map<string, { value: any; timestamp: number }>();
  private readonly CACHE_TTL = 30000; // 30 seconds
  private readonly MAX_CACHE_SIZE = 100;

  // AsyncStorage-compatible async API (most common)
  async getItem(key: string): Promise<string | null>
  async setItem(key: string, value: string): Promise<void>
  async removeItem(key: string): Promise<void>

  // Direct synchronous MMKV API (performance-critical)
  getString(key: string): string | undefined
  setString(key: string, value: string): void
  getNumber(key: string): number | undefined
  setNumber(key: string, value: number): void
  getBoolean(key: string): boolean | undefined
  setBoolean(key: string, value: boolean): void
}
```

**Cache Strategy:**

1. **Read Path:**
   - Check in-memory cache first
   - If cached and fresh (< 30s old), return immediately
   - If stale or missing, read from native MMKV
   - Update cache with fresh value

2. **Write Path:**
   - Write to native MMKV storage
   - Update in-memory cache immediately
   - Ensures read-after-write consistency

3. **Invalidation:**
   - LRU eviction when cache reaches 100 entries
   - Explicit invalidation on `removeItem()`
   - Automatic expiry after 30 seconds

**Error Handling:**
```typescript
try {
  const value = this.storage.getString(key);
  return value ?? null;
} catch (error) {
  logger.error(`[MMKVStorage] Error getting item ${key}:`, error);
  return null;
}
```

All operations are wrapped in try-catch blocks with logging, ensuring graceful degradation.

### Authentication Storage Keys

**File:** `src/services/AccountService.ts`

| Key | Type | Content | Purpose |
|-----|------|---------|---------|
| `@user:data` | JSON | `{id, email?, avatarUrl?, displayName?}` | Authenticated user data (currently unused due to disabled auth) |
| `@user:current` | String | `'local'` or `user.id` | User scope identifier for data isolation |

**Current Behavior (Auth Disabled):**

```typescript
async signUpWithEmail(email: string, password: string) {
  // Since signup is disabled, always return error
  return { error: 'Sign up is currently disabled due to upcoming system changes' };
}

async signInWithEmail(email: string, password: string) {
  // Since signin is disabled, always return error
  return { error: 'Authentication is currently disabled' };
}

async signOut() {
  await mmkvStorage.removeItem(USER_DATA_KEY); // Clear @user:data
  await mmkvStorage.setItem(USER_SCOPE_KEY, 'local'); // Reset to local scope
}

async getCurrentUser(): Promise<AuthUser | null> {
  const userData = await mmkvStorage.getItem(USER_DATA_KEY);
  if (!userData) return null;
  return JSON.parse(userData);
}
```

**User Scope Management:**

```typescript
async getCurrentUserIdScoped(): Promise<string> {
  const user = await this.getCurrentUser();
  if (user?.id) return user.id; // If authenticated, return user ID

  // Guest/local mode: return 'local' or generate local scope
  const scope = (await mmkvStorage.getItem(USER_SCOPE_KEY)) || 'local';
  if (!scope) await mmkvStorage.setItem(USER_SCOPE_KEY, 'local');
  return scope || 'local';
}
```

This pattern enables **data isolation**: all user-specific data (library, watch history, settings) is scoped to either a user ID or the 'local' scope.

---

## Profile Management System

### Profile Architecture

**Files:**
- `src/contexts/ProfileContext.tsx` - React Context for profile state
- `src/services/ProfileService.ts` - Singleton service for profile CRUD
- `src/services/PinService.ts` - PIN protection system

**Profile Data Model:**

```typescript
interface Profile {
  id: string;                // Unique: "profile_{timestamp}_{random}"
  name: string;              // Display name
  type: ProfileType;         // 'admin' | 'adult' | 'kids'
  avatarId: string;          // Avatar identifier from AVATAR_OPTIONS
  maxAgeRating: string;      // Content rating limit (e.g., 'R', 'PG-13', 'G')
  isPinProtected: boolean;   // Whether PIN is required to access
  isAdmin: boolean;          // Admin permissions (settings, create/delete profiles)
  createdAt: number;         // Timestamp
  updatedAt: number;         // Timestamp
  preferences: {             // Profile-specific settings
    autoPlayNextEpisode: boolean;
    showAdultContent: boolean;
    language: string;
    // ... more preferences
  };
}
```

### Profile Storage Pattern

**Storage Key:** `user_profiles` (single JSON array)

```typescript
// ProfileService storage pattern
private profilesCache: Profile[] | null = null; // In-memory cache

async getProfiles(): Promise<Profile[]> {
  // Check in-memory cache first
  if (this.profilesCache) {
    return this.profilesCache;
  }

  // Load from MMKV
  const profilesJson = await mmkvStorage.getItem(PROFILE_STORAGE_KEYS.profiles);
  if (profilesJson) {
    const profiles = JSON.parse(profilesJson) as Profile[];
    this.profilesCache = profiles; // Cache for subsequent reads
    return profiles;
  }

  return []; // No profiles exist
}

private async saveProfiles(profiles: Profile[]): Promise<void> {
  await mmkvStorage.setItem(PROFILE_STORAGE_KEYS.profiles, JSON.stringify(profiles));
  this.profilesCache = profiles; // Update cache
}
```

**Active Profile Tracking:**

**Storage Key:** `@profile:activeProfileId` (single profile ID)

```typescript
async setActiveProfile(profileId: string): Promise<boolean> {
  const profile = await this.getProfile(profileId);
  if (!profile) return false;

  await mmkvStorage.setItem(PROFILE_STORAGE_KEYS.activeProfileId, profileId);
  this.activeProfileIdCache = profileId;
  return true;
}
```

### ProfileContext Real-Time Sync

**File:** `src/contexts/ProfileContext.tsx`

**Challenge:** Multiple screens (ProfilesScreen, ProfileSwitcherBottomSheet) can modify profiles concurrently.

**Solution:** Polling-based synchronization

```typescript
// Subscribe to storage changes for profile updates
useEffect(() => {
  const checkForProfileUpdates = async () => {
    const storedProfiles = await mmkvStorage.getItem(PROFILE_STORAGE_KEY);
    if (storedProfiles) {
      const parsedProfiles: Profile[] = JSON.parse(storedProfiles);
      const currentActive = parsedProfiles.find(p => p.isActive);

      // Only update if active profile changed
      if (currentActive?.id !== activeProfile?.id) {
        setProfiles(parsedProfiles);
        setActiveProfileState(currentActive || null);
      }
    }
  };

  // Check periodically for profile updates (every 2 seconds)
  const intervalId = setInterval(checkForProfileUpdates, 2000);
  return () => clearInterval(intervalId);
}, [activeProfile?.id]);
```

**Implications:**
- **2-second polling interval** ensures UI reflects storage changes
- **Race conditions possible** if two components update simultaneously
- **No event-driven sync** (no MMKV change listeners)
- **Performance cost:** Frequent storage reads (mitigated by MMKV cache)

### Profile Creation Rules

**Constraints:**

```typescript
const MAX_PROFILES = 5; // Maximum profiles per device

async createProfile(input: CreateProfileInput): Promise<Profile | null> {
  const profiles = await this.getProfiles();

  // Check max profiles limit
  if (profiles.length >= MAX_PROFILES) {
    logger.warn('[ProfileService] Maximum profiles reached');
    return null;
  }

  // First profile is always admin
  const isFirstProfile = profiles.length === 0;
  const newProfile: Profile = {
    id: this.generateId(),
    name: input.name.trim(),
    type: input.type,
    isAdmin: isFirstProfile || input.type === 'admin',
    // ...
  };

  // Auto-activate first profile
  if (isFirstProfile) {
    await this.setActiveProfile(newProfile.id);
  }

  return newProfile;
}
```

### Profile Deletion Rules

**Constraints:**

```typescript
async deleteProfile(profileId: string): Promise<boolean> {
  const profiles = await this.getProfiles();

  // Cannot delete the last profile (minimum 1 required)
  if (profiles.length <= 1) {
    return false;
  }

  const profileToDelete = profiles.find(p => p.id === profileId);
  const updatedProfiles = profiles.filter(p => p.id !== profileId);

  // Admin promotion logic
  if (profileToDelete.isAdmin) {
    const adminExists = updatedProfiles.some(p => p.isAdmin);
    if (!adminExists && updatedProfiles.length > 0) {
      // Promote oldest adult profile to admin
      const adultProfiles = updatedProfiles.filter(p => p.type !== 'kids');
      const profileToPromote = adultProfiles.length > 0
        ? adultProfiles.sort((a, b) => a.createdAt - b.createdAt)[0]
        : updatedProfiles.sort((a, b) => a.createdAt - b.createdAt)[0];

      profileToPromote.isAdmin = true;
      profileToPromote.type = 'admin';
    }
  }

  // Switch active profile if deleted
  const activeId = await this.getActiveProfileId();
  if (activeId === profileId) {
    await this.setActiveProfile(updatedProfiles[0].id);
  }

  return true;
}
```

---

## Security Patterns

### PIN Protection System

**File:** `src/services/PinService.ts`

The PIN protection system provides **profile-level access control** with cryptographic security and lockout protection.

#### PIN Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  User enters PIN: "1234"                                         │
└─────────────┬───────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│  pinService.verifyPin(profileId, "1234")                         │
└─────────────┬───────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. Check lockout status                                         │
│     getLockoutInfo() → is profile locked?                        │
└─────────────┬───────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. Load stored PIN data                                         │
│     Read @profile:pin:{profileId} → {salt, hash}                │
└─────────────┬───────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. Hash input PIN                                               │
│     hashPin("1234", salt) → SHA-256(salt:1234:nuvio_profile_pin)│
└─────────────┬───────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. Compare hashes                                               │
│     inputHash === storedHash ?                                   │
└─────────────┬───────────────────────────────────────────────────┘
              │
              ├─► Match → resetAttempts()
              │           return { success: true }
              │
              └─► No match → recordFailedAttempt()
                            return { success: false, attemptsRemaining: N }
```

#### PIN Hashing Implementation

```typescript
// SHA-256 with random salt
private async hashPin(pin: string, salt: string): Promise<string> {
  const saltedPin = `${salt}:${pin}:nuvio_profile_pin`;
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    saltedPin
  );
  return hash;
}

// Random salt generation
private generateSalt(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
}

// Storage format
await mmkvStorage.setItem(`@profile:pin:${profileId}`, JSON.stringify({
  salt: "1704891234567_a1b2c3d4e5f6g7h8",
  hash: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8"
}));
```

**Security Properties:**
- **SHA-256 hashing:** Irreversible one-way function
- **Unique salts:** Prevents rainbow table attacks
- **Salt format:** `{timestamp}_{random}` ensures uniqueness
- **Salt storage:** Stored alongside hash (required for verification)
- **No plaintext:** PINs never stored in plaintext

#### PIN Attempt Tracking & Lockout

**Storage Key:** `@profile:pin_attempts:{profileId}`

```typescript
interface PinAttemptInfo {
  attempts: number;        // Failed attempt count
  lockedUntil: number | null; // Timestamp when lockout expires
  lastAttemptAt: number;   // Last attempt timestamp
}

const PIN_CONFIG = {
  pinMinLength: 4,
  pinMaxLength: 8,
  maxAttempts: 3,
  lockoutDurations: [
    30000,   // 30 seconds after 3 attempts
    60000,   // 1 minute after 6 attempts
    300000,  // 5 minutes after 9 attempts
  ],
};
```

**Progressive Lockout:**

```typescript
private async recordFailedAttempt(profileId: string): Promise<PinAttemptInfo> {
  const currentInfo = await this.getAttemptInfo(profileId);
  const now = Date.now();

  // Reset if previous lockout expired
  if (currentInfo.lockedUntil && now >= currentInfo.lockedUntil) {
    currentInfo.attempts = 0;
    currentInfo.lockedUntil = null;
  }

  currentInfo.attempts += 1;
  currentInfo.lastAttemptAt = now;

  // Apply progressive lockout
  if (currentInfo.attempts >= PIN_CONFIG.maxAttempts) {
    const lockoutIndex = Math.min(
      Math.floor(currentInfo.attempts / PIN_CONFIG.maxAttempts) - 1,
      PIN_CONFIG.lockoutDurations.length - 1
    );
    const lockoutDuration = PIN_CONFIG.lockoutDurations[lockoutIndex];
    currentInfo.lockedUntil = now + lockoutDuration;
  }

  await mmkvStorage.setItem(
    `@profile:pin_attempts:${profileId}`,
    JSON.stringify(currentInfo)
  );

  return currentInfo;
}
```

**Lockout Timeline Example:**

| Attempt | Result | Action |
|---------|--------|--------|
| 1-2 | Wrong PIN | No lockout, show attempts remaining |
| 3 | Wrong PIN | **30-second lockout** |
| 4-5 | After lockout expires | No lockout, show attempts remaining |
| 6 | Wrong PIN | **1-minute lockout** |
| 7-8 | After lockout expires | No lockout, show attempts remaining |
| 9 | Wrong PIN | **5-minute lockout** |
| ... | Continues | 5-minute lockout persists |

#### PIN Validation Rules

```typescript
validatePinFormat(pin: string): { valid: boolean; error?: string } {
  if (!pin) {
    return { valid: false, error: 'PIN is required' };
  }

  if (!/^\d+$/.test(pin)) {
    return { valid: false, error: 'PIN must contain only numbers' };
  }

  if (pin.length < 4) {
    return { valid: false, error: 'PIN must be at least 4 digits' };
  }

  if (pin.length > 8) {
    return { valid: false, error: 'PIN must be at most 8 digits' };
  }

  return { valid: true };
}
```

**Allowed PINs:** 4-8 digit numeric codes (e.g., `1234`, `123456`, `98765432`)

---

## Authentication Flow Diagrams

### Current Authentication Flow (Local Mode)

```
┌──────────────────────────────────────────────────────────────────┐
│  User opens app                                                   │
└──────┬───────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────┐
│  AccountContext loads                                             │
│  - setLoading(true)                                               │
│  - accountService.getCurrentUser()                                │
│    → Reads @user:data from MMKV (always null in local mode)      │
│  - setUser(null)                                                  │
│  - setLoading(false)                                              │
└──────┬───────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────┐
│  ProfileContext loads in parallel                                 │
│  - profileService.loadProfiles()                                  │
│    → Reads 'user_profiles' from MMKV                              │
│  - setProfiles(profiles)                                          │
│  - setActiveProfile(profiles.find(p => p.isActive))               │
└──────┬───────────────────────────────────────────────────────────┘
       │
       ├─► Profiles exist → Navigate to ProfilesScreen
       │                    User selects profile or creates new one
       │
       └─► No profiles → Navigate to OnboardingScreen
                         User creates first profile (auto-admin)
```

### Profile Selection Flow

```
┌──────────────────────────────────────────────────────────────────┐
│  ProfilesScreen displays all profiles                             │
└──────┬───────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────┐
│  User taps profile                                                │
└──────┬───────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────┐
│  Check if profile is PIN-protected                                │
│  pinService.hasPin(profileId)                                     │
└──────┬───────────────────────────────────────────────────────────┘
       │
       ├─► PIN protected → Show PIN entry modal
       │                   User enters PIN
       │                   pinService.verifyPin(profileId, pin)
       │                   │
       │                   ├─► Valid → Continue
       │                   │
       │                   └─► Invalid → Show error
       │                               Decrement attempts
       │                               Check lockout
       │
       └─► No PIN → Continue

       ▼
┌──────────────────────────────────────────────────────────────────┐
│  profileService.setActiveProfile(profileId)                       │
│  - Write to @profile:activeProfileId                              │
│  - Update ProfileContext.activeProfile                            │
└──────┬───────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────┐
│  Navigate to HomeScreen                                           │
│  - All data scoped to active profile                              │
│  - Library, watch history, settings isolated                      │
└──────────────────────────────────────────────────────────────────┘
```

### Profile Creation Flow

```
┌──────────────────────────────────────────────────────────────────┐
│  User taps "Add Profile"                                          │
└──────┬───────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────┐
│  Check profile count                                              │
│  profileService.canCreateProfile() → count < 5?                   │
└──────┬───────────────────────────────────────────────────────────┘
       │
       ├─► At limit → Show error "Maximum 5 profiles reached"
       │
       └─► Can create → Continue

       ▼
┌──────────────────────────────────────────────────────────────────┐
│  Show profile creation form                                       │
│  - Name input                                                     │
│  - Profile type: Admin / Adult / Kids                             │
│  - Avatar selection                                               │
│  - Optional PIN (4-8 digits)                                      │
└──────┬───────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────┐
│  Validate inputs                                                  │
│  - Name not empty                                                 │
│  - Name not duplicate (case-insensitive)                          │
│  - PIN format valid (if provided)                                 │
└──────┬───────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────┐
│  profileService.createProfile(input)                              │
│  1. Generate unique ID: "profile_{timestamp}_{random}"            │
│  2. Set isAdmin = true if first profile or type === 'admin'       │
│  3. Apply default preferences (kids profiles get kid-safe prefs)  │
│  4. Save to MMKV: 'user_profiles'                                 │
└──────┬───────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────┐
│  If PIN provided:                                                 │
│  pinService.setPin(profileId, pin)                                │
│  1. Validate PIN format (4-8 digits)                              │
│  2. Generate random salt                                          │
│  3. Hash PIN with SHA-256                                         │
│  4. Store {salt, hash} at @profile:pin:{profileId}                │
└──────┬───────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────┐
│  If first profile:                                                │
│  profileService.setActiveProfile(newProfile.id)                   │
│  Auto-activate and navigate to HomeScreen                         │
└──────────────────────────────────────────────────────────────────┘
```

### AccountContext Refresh Pattern

**File:** `src/contexts/AccountContext.tsx`

The `refreshCurrentUser()` method is critical for session management and has sophisticated timeout handling:

```typescript
refreshCurrentUser: async () => {
  // Prevent concurrent refresh operations
  if (loading) {
    if (__DEV__) console.log('[AccountContext] Already loading, skipping refresh');
    return;
  }

  if (__DEV__) console.log('[AccountContext] Starting refreshCurrentUser');
  setLoading(true);

  // 5-second timeout to prevent infinite loading states
  loadingTimeoutRef.current = setTimeout(() => {
    console.warn('[AccountContext] Account loading timeout, forcing loading to false');
    setLoading(false);
  }, 5000);

  try {
    const u = await accountService.getCurrentUser();
    if (__DEV__) console.log('[AccountContext] refreshCurrentUser completed:', u ? 'user found' : 'no user');
    setUser(u);
  } catch (error) {
    console.error('[AccountContext] Failed to refresh current user:', error);
    setUser(null); // Ensure we don't get stuck with stale state
  } finally {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    setLoading(false);
    if (__DEV__) console.log('[AccountContext] refreshCurrentUser finished');
  }
}
```

**Key Patterns:**
- **Concurrency Guard:** Prevents multiple simultaneous refresh operations
- **Timeout Protection:** Forces loading=false after 5 seconds (reduced from longer timeout)
- **Error Recovery:** Sets user to null on error to avoid stuck states
- **Dev Logging:** Comprehensive logging for debugging auth issues

---

## State Synchronization

### Cross-Context Communication

The app has **15 React Context providers** that need to stay synchronized. Authentication and profile state changes trigger cascading updates across multiple contexts.

#### Event-Driven Updates

**File:** Referenced in `src/contexts/` (various)

The app uses **EventEmitter3** for cross-context communication:

```typescript
// Example: Settings changes trigger catalog refresh
import EventEmitter from 'eventemitter3';

const eventBus = new EventEmitter();

// Emit event when settings change
eventBus.emit('settings:changed', { key: 'adultContent', value: true });

// Listen in CatalogContext
useEffect(() => {
  const handleSettingsChange = () => {
    refreshCatalog();
  };
  eventBus.on('settings:changed', handleSettingsChange);
  return () => eventBus.off('settings:changed', handleSettingsChange);
}, []);
```

#### Profile Switch Synchronization

When a user switches profiles, multiple contexts need to reload their data:

```
Profile Switch Triggered
│
├─► ProfileContext.setActiveProfile(profileId)
│   └─► Write to MMKV: @profile:activeProfileId
│
├─► AccountContext (no action - user is null in local mode)
│
├─► TraktContext.refreshTraktData()
│   └─► Reload Trakt sync data for new profile
│
├─► DownloadsContext.refreshDownloads()
│   └─► Reload offline content for new profile
│
├─► CatalogContext.refreshCatalog()
│   └─► Reload content library for new profile
│
├─► ThemeContext.loadThemePreferences()
│   └─► Apply profile-specific theme
│
└─► SettingsContext.loadSettings()
    └─► Load profile-specific settings
```

**Current Implementation:** Manual refresh calls in profile switch handler.

**Challenge:** No automatic cascade - each context must be explicitly refreshed.

### Polling-Based Sync

**File:** `src/contexts/ProfileContext.tsx`

As noted earlier, ProfileContext uses **2-second polling** to detect storage changes:

```typescript
useEffect(() => {
  const intervalId = setInterval(async () => {
    const storedProfiles = await mmkvStorage.getItem(PROFILE_STORAGE_KEY);
    if (storedProfiles) {
      const parsedProfiles: Profile[] = JSON.parse(storedProfiles);
      const currentActive = parsedProfiles.find(p => p.isActive);

      // Only update if active profile changed
      if (currentActive?.id !== activeProfile?.id) {
        setProfiles(parsedProfiles);
        setActiveProfileState(currentActive || null);
      }
    }
  }, 2000);

  return () => clearInterval(intervalId);
}, [activeProfile?.id]);
```

**Tradeoffs:**
- ✅ Simple implementation
- ✅ Works across all components
- ✅ No need for event emitter
- ❌ 2-second latency for updates
- ❌ Frequent storage reads (every 2s per context)
- ❌ Battery impact on mobile devices
- ❌ Potential race conditions

### Loading State Coordination

**File:** `src/contexts/AccountContext.tsx`

AccountContext implements a **5-second timeout** to prevent stuck loading states:

```typescript
// Set a timeout to prevent loading from getting stuck
loadingTimeoutRef.current = setTimeout(() => {
  console.warn('[AccountContext] Account loading timeout, forcing loading to false');
  setLoading(false);
}, 5000); // Reduced to 5 seconds for faster fallback
```

**Rationale:**
- MMKV reads are typically < 10ms
- Network calls (when auth is enabled) can hang
- Prevents UI from being stuck in loading state indefinitely
- User experience: Show error after 5s rather than infinite spinner

---

## Migration Strategy: Rust Core vs Native Layer

### Current Architecture Analysis

The current authentication and profile management system is **tightly coupled to React Native** through:

1. **React Context API** - State management tied to React component lifecycle
2. **MMKV Storage** - Native storage via React Native bridge
3. **Expo Crypto** - SHA-256 hashing via Expo SDK
4. **Event Emitter** - JavaScript-based cross-context communication
5. **Polling** - JavaScript setInterval for storage sync

### Proposed Tri-Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Native UI Layer (Kotlin/Swift)               │
│                                                                  │
│  - ProfileSelectionActivity (Android) / ProfileViewController (iOS)
│  - PINEntryDialog / PINEntryViewController                       │
│  - UI state management (ViewModel / ObservableObject)            │
│  - Platform-specific UI components                               │
│  - Navigation and routing                                        │
└─────────────────┬───────────────────────────────────────────────┘
                  │ FFI calls via UniFFI
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FFI Boundary (UniFFI)                       │
│                                                                  │
│  - Auto-generated Kotlin/Swift bindings                          │
│  - Type-safe function calls                                      │
│  - Error propagation (Result<T, E> → platform exceptions)        │
│  - Async/await bridging (Rust futures → Kotlin coroutines)       │
│  - Memory management (Arc<> for shared state)                    │
└─────────────────┬───────────────────────────────────────────────┘
                  │ C ABI (extern "C")
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Rust SDK Core (Business Logic)                │
│                                                                  │
│  Modules:                                                        │
│  ├── nuvio_core::auth                                            │
│  │   ├── AuthManager (user scope, session state)                │
│  │   ├── UserScope enum (Local | Authenticated(id))             │
│  │   └── SessionStorage trait (platform-agnostic interface)     │
│  │                                                               │
│  ├── nuvio_core::profiles                                        │
│  │   ├── ProfileManager (CRUD operations)                       │
│  │   ├── Profile struct                                          │
│  │   ├── ProfileType enum                                        │
│  │   └── ProfileRepository trait                                │
│  │                                                               │
│  ├── nuvio_core::security                                        │
│  │   ├── PinManager (PIN verification)                          │
│  │   ├── PinHasher (SHA-256 with salts)                         │
│  │   ├── LockoutTracker (attempt tracking)                      │
│  │   └── CryptoProvider trait                                    │
│  │                                                               │
│  └── nuvio_core::storage                                         │
│      ├── StorageEngine trait (key-value interface)              │
│      ├── CachedStorage (in-memory cache + persistent)           │
│      └── StorageKey enum (type-safe storage keys)               │
└─────────────────┬───────────────────────────────────────────────┘
                  │ Platform implementations
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Platform Storage Layer                        │
│                                                                  │
│  Android: SharedPreferences or DataStore (passed via FFI)        │
│  iOS: UserDefaults or Keychain (passed via FFI)                  │
│  Rust manages logic, platforms provide storage primitives        │
└─────────────────────────────────────────────────────────────────┘
```

### Layer Responsibility Matrix

| Concern | Current (React Native) | Rust SDK Core | Native UI Layer | FFI Boundary |
|---------|------------------------|---------------|-----------------|--------------|
| **Authentication State** | AccountContext | ✅ AuthManager | Read-only state | Pass user scope |
| **User Scope Management** | AccountService | ✅ UserScope enum | Request scope | Serialize scope |
| **Profile CRUD** | ProfileService | ✅ ProfileManager | Trigger actions | Pass Profile structs |
| **Profile Validation** | ProfileService | ✅ Validation logic | Display errors | Pass Result<> |
| **PIN Hashing** | PinService (Expo Crypto) | ✅ PinHasher (RustCrypto) | No access | Pass hash result |
| **PIN Verification** | PinService | ✅ PinManager | Request verification | Pass bool |
| **Lockout Tracking** | PinService | ✅ LockoutTracker | Display lockout UI | Pass lockout state |
| **Storage Operations** | mmkvStorage | ✅ StorageEngine trait | Provide impl | Pass storage handle |
| **In-Memory Cache** | mmkvStorage | ✅ CachedStorage | None | Transparent |
| **Profile Selection UI** | ProfilesScreen | None | ✅ ProfileSelectionVC | Trigger via FFI |
| **PIN Entry UI** | PIN Modal | None | ✅ PINEntryDialog | Trigger via FFI |
| **Navigation** | React Navigation | None | ✅ Platform navigation | None |
| **Error Display** | Toast/Snackbar | Generate errors | ✅ Show errors | Propagate errors |
| **Loading States** | useState(loading) | None | ✅ UI loading | None |
| **Event Bus** | EventEmitter3 | ✅ Rust channels/observers | Subscribe | Bridge events |

### Detailed Component Migration

#### 1. Authentication State → Rust Core

**Current (AccountContext.tsx):**
```typescript
const [user, setUser] = useState<AuthUser | null>(null);
const [loading, setLoading] = useState(true);

const getCurrentUser = async () => {
  const userData = await mmkvStorage.getItem('@user:data');
  return userData ? JSON.parse(userData) : null;
};

const getCurrentUserIdScoped = async () => {
  const user = await getCurrentUser();
  if (user?.id) return user.id;
  const scope = await mmkvStorage.getItem('@user:current') || 'local';
  return scope;
};
```

**Proposed (Rust SDK):**
```rust
// nuvio-core/src/auth/mod.rs

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthUser {
    pub id: String,
    pub email: Option<String>,
    pub avatar_url: Option<String>,
    pub display_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum UserScope {
    Local,
    Authenticated { user_id: String },
}

pub struct AuthManager {
    storage: Arc<dyn StorageEngine>,
    current_user: Arc<RwLock<Option<AuthUser>>>,
    current_scope: Arc<RwLock<UserScope>>,
}

impl AuthManager {
    pub async fn get_current_user(&self) -> Result<Option<AuthUser>, AuthError> {
        // Check in-memory cache
        let cached = self.current_user.read().await.clone();
        if cached.is_some() {
            return Ok(cached);
        }

        // Load from storage
        let user_data = self.storage.get("@user:data").await?;
        match user_data {
            Some(json) => {
                let user: AuthUser = serde_json::from_str(&json)?;
                *self.current_user.write().await = Some(user.clone());
                Ok(Some(user))
            }
            None => Ok(None),
        }
    }

    pub async fn get_current_user_scope(&self) -> Result<UserScope, AuthError> {
        let user = self.get_current_user().await?;

        match user {
            Some(u) => Ok(UserScope::Authenticated { user_id: u.id }),
            None => {
                let scope_str = self.storage.get("@user:current").await?
                    .unwrap_or_else(|| "local".to_string());

                if scope_str == "local" {
                    Ok(UserScope::Local)
                } else {
                    Ok(UserScope::Authenticated { user_id: scope_str })
                }
            }
        }
    }

    pub async fn sign_out(&self) -> Result<(), AuthError> {
        self.storage.remove("@user:data").await?;
        self.storage.set("@user:current", "local").await?;

        *self.current_user.write().await = None;
        *self.current_scope.write().await = UserScope::Local;

        Ok(())
    }
}
```

**Native UI Layer (Kotlin):**
```kotlin
// Android native
class AuthViewModel : ViewModel() {
    private val _user = MutableStateFlow<AuthUser?>(null)
    val user: StateFlow<AuthUser?> = _user.asStateFlow()

    private val _loading = MutableStateFlow(false)
    val loading: StateFlow<Boolean> = _loading.asStateFlow()

    fun loadUser() {
        viewModelScope.launch {
            _loading.value = true
            try {
                // Call Rust via UniFFI
                val user = authManagerGetCurrentUser()
                _user.value = user
            } catch (e: AuthException) {
                Log.e("AuthViewModel", "Failed to load user", e)
                _user.value = null
            } finally {
                _loading.value = false
            }
        }
    }
}
```

**Native UI Layer (Swift):**
```swift
// iOS native
@MainActor
class AuthViewModel: ObservableObject {
    @Published var user: AuthUser? = nil
    @Published var loading: Bool = false

    func loadUser() async {
        loading = true
        defer { loading = false }

        do {
            // Call Rust via UniFFI
            user = try await authManagerGetCurrentUser()
        } catch {
            print("Failed to load user: \\(error)")
            user = nil
        }
    }
}
```

#### 2. Profile Management → Rust Core

**Current (ProfileService.ts):**
```typescript
class ProfileService {
  private profilesCache: Profile[] | null = null;

  async getProfiles(): Promise<Profile[]> {
    if (this.profilesCache) return this.profilesCache;

    const profilesJson = await mmkvStorage.getItem(PROFILE_STORAGE_KEYS.profiles);
    if (profilesJson) {
      const profiles = JSON.parse(profilesJson) as Profile[];
      this.profilesCache = profiles;
      return profiles;
    }
    return [];
  }

  async createProfile(input: CreateProfileInput): Promise<Profile | null> {
    const profiles = await this.getProfiles();
    if (profiles.length >= MAX_PROFILES) return null;

    const newProfile: Profile = {
      id: this.generateId(),
      name: input.name.trim(),
      type: input.type,
      // ...
    };

    await this.saveProfiles([...profiles, newProfile]);
    return newProfile;
  }
}
```

**Proposed (Rust SDK):**
```rust
// nuvio-core/src/profiles/mod.rs

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Profile {
    pub id: String,
    pub name: String,
    pub profile_type: ProfileType,
    pub avatar_id: String,
    pub max_age_rating: String,
    pub is_pin_protected: bool,
    pub is_admin: bool,
    pub created_at: i64,
    pub updated_at: i64,
    pub preferences: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ProfileType {
    Admin,
    Adult,
    Kids,
}

pub const MAX_PROFILES: usize = 5;

pub struct ProfileManager {
    storage: Arc<dyn StorageEngine>,
    profiles_cache: Arc<RwLock<Option<Vec<Profile>>>>,
    active_profile_id: Arc<RwLock<Option<String>>>,
}

impl ProfileManager {
    pub async fn get_profiles(&self) -> Result<Vec<Profile>, ProfileError> {
        // Check cache
        if let Some(cached) = self.profiles_cache.read().await.as_ref() {
            return Ok(cached.clone());
        }

        // Load from storage
        let profiles_json = self.storage.get("user_profiles").await?;
        let profiles: Vec<Profile> = match profiles_json {
            Some(json) => serde_json::from_str(&json)?,
            None => Vec::new(),
        };

        // Update cache
        *self.profiles_cache.write().await = Some(profiles.clone());

        Ok(profiles)
    }

    pub async fn create_profile(&self, input: CreateProfileInput) -> Result<Profile, ProfileError> {
        let mut profiles = self.get_profiles().await?;

        // Validate constraints
        if profiles.len() >= MAX_PROFILES {
            return Err(ProfileError::MaxProfilesReached);
        }

        if input.name.trim().is_empty() {
            return Err(ProfileError::InvalidName);
        }

        // Check for duplicate name (case-insensitive)
        let name_lower = input.name.trim().to_lowercase();
        if profiles.iter().any(|p| p.name.to_lowercase() == name_lower) {
            return Err(ProfileError::NameTaken);
        }

        // Create profile
        let is_first_profile = profiles.is_empty();
        let new_profile = Profile {
            id: generate_profile_id(),
            name: input.name.trim().to_string(),
            profile_type: input.profile_type,
            avatar_id: input.avatar_id.unwrap_or_else(|| "default".to_string()),
            max_age_rating: get_default_max_age_rating(&input.profile_type),
            is_pin_protected: input.pin.is_some(),
            is_admin: is_first_profile || matches!(input.profile_type, ProfileType::Admin),
            created_at: chrono::Utc::now().timestamp_millis(),
            updated_at: chrono::Utc::now().timestamp_millis(),
            preferences: get_default_preferences(&input.profile_type),
        };

        profiles.push(new_profile.clone());
        self.save_profiles(profiles).await?;

        // Auto-activate first profile
        if is_first_profile {
            self.set_active_profile(&new_profile.id).await?;
        }

        Ok(new_profile)
    }

    async fn save_profiles(&self, profiles: Vec<Profile>) -> Result<(), ProfileError> {
        let json = serde_json::to_string(&profiles)?;
        self.storage.set("user_profiles", &json).await?;
        *self.profiles_cache.write().await = Some(profiles);
        Ok(())
    }
}

fn generate_profile_id() -> String {
    let timestamp = chrono::Utc::now().timestamp_millis();
    let random: u64 = rand::random();
    format!("profile_{}_{:x}", timestamp, random)
}
```

#### 3. PIN Security → Rust Core

**Current (PinService.ts):**
```typescript
private async hashPin(pin: string, salt: string): Promise<string> {
  const saltedPin = `${salt}:${pin}:nuvio_profile_pin`;
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    saltedPin
  );
  return hash;
}

async verifyPin(profileId: string, pin: string): Promise<{
  success: boolean;
  attemptsRemaining?: number;
  lockedUntil?: number;
}> {
  // Lockout check, hash comparison, attempt tracking
}
```

**Proposed (Rust SDK):**
```rust
// nuvio-core/src/security/pin.rs

use sha2::{Sha256, Digest};
use rand::Rng;

pub struct PinHasher;

impl PinHasher {
    pub fn generate_salt() -> String {
        let timestamp = chrono::Utc::now().timestamp_millis();
        let random: String = rand::thread_rng()
            .sample_iter(&rand::distributions::Alphanumeric)
            .take(16)
            .map(char::from)
            .collect();
        format!("{}_{}", timestamp, random)
    }

    pub fn hash_pin(pin: &str, salt: &str) -> String {
        let salted_pin = format!("{}:{}:nuvio_profile_pin", salt, pin);
        let mut hasher = Sha256::new();
        hasher.update(salted_pin.as_bytes());
        let result = hasher.finalize();
        hex::encode(result)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PinData {
    pub salt: String,
    pub hash: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PinAttemptInfo {
    pub attempts: u32,
    pub locked_until: Option<i64>,
    pub last_attempt_at: i64,
}

pub const PIN_MAX_ATTEMPTS: u32 = 3;
pub const LOCKOUT_DURATIONS: &[i64] = &[30_000, 60_000, 300_000]; // milliseconds

pub struct PinManager {
    storage: Arc<dyn StorageEngine>,
}

impl PinManager {
    pub async fn verify_pin(&self, profile_id: &str, pin: &str) -> Result<PinVerifyResult, PinError> {
        // 1. Check lockout
        let lockout_info = self.get_lockout_info(profile_id).await?;
        if lockout_info.is_locked {
            return Ok(PinVerifyResult::Locked {
                locked_until: lockout_info.locked_until.unwrap(),
            });
        }

        // 2. Load PIN data
        let pin_key = format!("@profile:pin:{}", profile_id);
        let pin_data_json = self.storage.get(&pin_key).await?;

        let pin_data: PinData = match pin_data_json {
            Some(json) => serde_json::from_str(&json)?,
            None => return Ok(PinVerifyResult::Success), // No PIN set
        };

        // 3. Hash and compare
        let input_hash = PinHasher::hash_pin(pin, &pin_data.salt);

        if input_hash == pin_data.hash {
            // Success - reset attempts
            self.reset_attempts(profile_id).await?;
            Ok(PinVerifyResult::Success)
        } else {
            // Failed - record attempt
            let attempt_info = self.record_failed_attempt(profile_id).await?;
            let attempts_remaining = PIN_MAX_ATTEMPTS.saturating_sub(attempt_info.attempts);

            Ok(PinVerifyResult::Failed {
                attempts_remaining,
                locked_until: attempt_info.locked_until,
            })
        }
    }

    async fn record_failed_attempt(&self, profile_id: &str) -> Result<PinAttemptInfo, PinError> {
        let mut attempt_info = self.get_attempt_info(profile_id).await?;
        let now = chrono::Utc::now().timestamp_millis();

        // Reset if previous lockout expired
        if let Some(locked_until) = attempt_info.locked_until {
            if now >= locked_until {
                attempt_info.attempts = 0;
                attempt_info.locked_until = None;
            }
        }

        attempt_info.attempts += 1;
        attempt_info.last_attempt_at = now;

        // Apply progressive lockout
        if attempt_info.attempts >= PIN_MAX_ATTEMPTS {
            let lockout_index = ((attempt_info.attempts / PIN_MAX_ATTEMPTS) - 1) as usize;
            let lockout_index = lockout_index.min(LOCKOUT_DURATIONS.len() - 1);
            let lockout_duration = LOCKOUT_DURATIONS[lockout_index];
            attempt_info.locked_until = Some(now + lockout_duration);
        }

        // Save to storage
        let attempts_key = format!("@profile:pin_attempts:{}", profile_id);
        let json = serde_json::to_string(&attempt_info)?;
        self.storage.set(&attempts_key, &json).await?;

        Ok(attempt_info)
    }
}

#[derive(Debug)]
pub enum PinVerifyResult {
    Success,
    Failed {
        attempts_remaining: u32,
        locked_until: Option<i64>,
    },
    Locked {
        locked_until: i64,
    },
}
```

#### 4. Storage Abstraction → Rust Trait

**Proposed (Rust SDK):**
```rust
// nuvio-core/src/storage/mod.rs

#[async_trait]
pub trait StorageEngine: Send + Sync {
    async fn get(&self, key: &str) -> Result<Option<String>, StorageError>;
    async fn set(&self, key: &str, value: &str) -> Result<(), StorageError>;
    async fn remove(&self, key: &str) -> Result<(), StorageError>;
    async fn get_all_keys(&self) -> Result<Vec<String>, StorageError>;
    async fn clear(&self) -> Result<(), StorageError>;
}

pub struct CachedStorage<T: StorageEngine> {
    inner: T,
    cache: Arc<RwLock<HashMap<String, CacheEntry>>>,
    cache_ttl: Duration,
    max_cache_size: usize,
}

struct CacheEntry {
    value: String,
    timestamp: std::time::Instant,
}

impl<T: StorageEngine> CachedStorage<T> {
    pub fn new(inner: T, cache_ttl: Duration, max_cache_size: usize) -> Self {
        Self {
            inner,
            cache: Arc::new(RwLock::new(HashMap::new())),
            cache_ttl,
            max_cache_size,
        }
    }
}

#[async_trait]
impl<T: StorageEngine> StorageEngine for CachedStorage<T> {
    async fn get(&self, key: &str) -> Result<Option<String>, StorageError> {
        // Check cache
        {
            let cache = self.cache.read().await;
            if let Some(entry) = cache.get(key) {
                if entry.timestamp.elapsed() < self.cache_ttl {
                    return Ok(Some(entry.value.clone()));
                }
            }
        }

        // Cache miss - read from inner storage
        let value = self.inner.get(key).await?;

        // Update cache
        if let Some(ref v) = value {
            let mut cache = self.cache.write().await;

            // LRU eviction
            if cache.len() >= self.max_cache_size {
                if let Some(oldest_key) = cache.keys().next().cloned() {
                    cache.remove(&oldest_key);
                }
            }

            cache.insert(key.to_string(), CacheEntry {
                value: v.clone(),
                timestamp: std::time::Instant::now(),
            });
        }

        Ok(value)
    }

    async fn set(&self, key: &str, value: &str) -> Result<(), StorageError> {
        self.inner.set(key, value).await?;

        // Update cache immediately
        let mut cache = self.cache.write().await;
        cache.insert(key.to_string(), CacheEntry {
            value: value.to_string(),
            timestamp: std::time::Instant::now(),
        });

        Ok(())
    }

    async fn remove(&self, key: &str) -> Result<(), StorageError> {
        self.inner.remove(key).await?;

        // Invalidate cache
        let mut cache = self.cache.write().await;
        cache.remove(key);

        Ok(())
    }

    // ... other methods
}
```

**Platform Implementation (Kotlin - Android):**
```kotlin
// Implement StorageEngine using Android SharedPreferences
class SharedPreferencesStorage(
    private val context: Context
) : StorageEngine {
    private val prefs = context.getSharedPreferences("nuvio_storage", Context.MODE_PRIVATE)

    override suspend fun get(key: String): String? = withContext(Dispatchers.IO) {
        prefs.getString(key, null)
    }

    override suspend fun set(key: String, value: String) = withContext(Dispatchers.IO) {
        prefs.edit().putString(key, value).apply()
    }

    override suspend fun remove(key: String) = withContext(Dispatchers.IO) {
        prefs.edit().remove(key).apply()
    }

    // ... other methods
}

// Pass to Rust via UniFFI
val storage = SharedPreferencesStorage(context)
nuvioInit(storage) // UniFFI-generated function
```

**Platform Implementation (Swift - iOS):**
```swift
// Implement StorageEngine using iOS UserDefaults
class UserDefaultsStorage: StorageEngine {
    private let userDefaults = UserDefaults.standard

    func get(key: String) async throws -> String? {
        return userDefaults.string(forKey: key)
    }

    func set(key: String, value: String) async throws {
        userDefaults.set(value, forKey: key)
    }

    func remove(key: String) async throws {
        userDefaults.removeObject(forKey: key)
    }

    // ... other methods
}

// Pass to Rust via UniFFI
let storage = UserDefaultsStorage()
nuvioInit(storage: storage) // UniFFI-generated function
```

### FFI Boundary Design (UniFFI)

**UniFFI Definition (nuvio.udl):**
```
namespace nuvio {
    // Initialize Rust SDK with platform storage
    void init(StorageEngine storage);
};

// Storage trait
[Trait]
interface StorageEngine {
    [Async]
    string? get(string key);

    [Async]
    void set(string key, string value);

    [Async]
    void remove(string key);

    [Async]
    sequence<string> get_all_keys();

    [Async]
    void clear();
};

// Auth types
dictionary AuthUser {
    string id;
    string? email;
    string? avatar_url;
    string? display_name;
};

[Enum]
interface UserScope {
    Local();
    Authenticated(string user_id);
};

// Auth manager
interface AuthManager {
    constructor(StorageEngine storage);

    [Async, Throws=AuthError]
    AuthUser? get_current_user();

    [Async, Throws=AuthError]
    UserScope get_current_user_scope();

    [Async, Throws=AuthError]
    void sign_out();

    [Async, Throws=AuthError]
    void update_profile(string? avatar_url, string? display_name);
};

[Error]
enum AuthError {
    "StorageError",
    "SerializationError",
    "NotAuthenticated",
};

// Profile types
dictionary Profile {
    string id;
    string name;
    ProfileType profile_type;
    string avatar_id;
    string max_age_rating;
    boolean is_pin_protected;
    boolean is_admin;
    i64 created_at;
    i64 updated_at;
    record<string, string> preferences; // Simplified for FFI
};

[Enum]
interface ProfileType {
    Admin();
    Adult();
    Kids();
};

dictionary CreateProfileInput {
    string name;
    ProfileType profile_type;
    string? avatar_id;
    string? pin;
};

// Profile manager
interface ProfileManager {
    constructor(StorageEngine storage);

    [Async, Throws=ProfileError]
    sequence<Profile> get_profiles();

    [Async, Throws=ProfileError]
    Profile? get_active_profile();

    [Async, Throws=ProfileError]
    Profile create_profile(CreateProfileInput input);

    [Async, Throws=ProfileError]
    Profile update_profile(string profile_id, string? name, string? avatar_id);

    [Async, Throws=ProfileError]
    void delete_profile(string profile_id);

    [Async, Throws=ProfileError]
    void set_active_profile(string profile_id);
};

[Error]
enum ProfileError {
    "MaxProfilesReached",
    "InvalidName",
    "NameTaken",
    "ProfileNotFound",
    "CannotDeleteLastProfile",
    "StorageError",
};

// PIN types
[Enum]
interface PinVerifyResult {
    Success();
    Failed(u32 attempts_remaining, i64? locked_until);
    Locked(i64 locked_until);
};

// PIN manager
interface PinManager {
    constructor(StorageEngine storage);

    [Async, Throws=PinError]
    void set_pin(string profile_id, string pin);

    [Async, Throws=PinError]
    PinVerifyResult verify_pin(string profile_id, string pin);

    [Async, Throws=PinError]
    boolean has_pin(string profile_id);

    [Async, Throws=PinError]
    void remove_pin(string profile_id);
};

[Error]
enum PinError {
    "InvalidFormat",
    "StorageError",
    "HashingError",
};
```

**Generated Kotlin API (Auto-generated by UniFFI):**
```kotlin
// Auto-generated by UniFFI
package com.nuvio.core

suspend fun init(storage: StorageEngine)

interface StorageEngine {
    suspend fun get(key: String): String?
    suspend fun set(key: String, value: String)
    suspend fun remove(key: String)
    suspend fun getAllKeys(): List<String>
    suspend fun clear()
}

data class AuthUser(
    val id: String,
    val email: String?,
    val avatarUrl: String?,
    val displayName: String?
)

sealed class UserScope {
    object Local : UserScope()
    data class Authenticated(val userId: String) : UserScope()
}

class AuthManager(storage: StorageEngine) {
    suspend fun getCurrentUser(): AuthUser?
    suspend fun getCurrentUserScope(): UserScope
    suspend fun signOut()
    suspend fun updateProfile(avatarUrl: String?, displayName: String?)
}

sealed class AuthException : Exception() {
    class StorageError : AuthException()
    class SerializationError : AuthException()
    class NotAuthenticated : AuthException()
}

// ... similar for ProfileManager, PinManager
```

**Generated Swift API (Auto-generated by UniFFI):**
```swift
// Auto-generated by UniFFI
import Foundation

public func nuvioInit(storage: StorageEngine) async throws

public protocol StorageEngine {
    func get(key: String) async throws -> String?
    func set(key: String, value: String) async throws
    func remove(key: String) async throws
    func getAllKeys() async throws -> [String]
    func clear() async throws
}

public struct AuthUser {
    public let id: String
    public let email: String?
    public let avatarUrl: String?
    public let displayName: String?
}

public enum UserScope {
    case local
    case authenticated(userId: String)
}

public class AuthManager {
    public init(storage: StorageEngine) throws

    public func getCurrentUser() async throws -> AuthUser?
    public func getCurrentUserScope() async throws -> UserScope
    public func signOut() async throws
    public func updateProfile(avatarUrl: String?, displayName: String?) async throws
}

public enum AuthError: Error {
    case storageError
    case serializationError
    case notAuthenticated
}

// ... similar for ProfileManager, PinManager
```

---

## Recommendations

### High Priority Migrations to Rust Core

1. **✅ PIN Security (PinManager)** - HIGH PRIORITY
   - **Rationale:** Cryptographic operations benefit from Rust's safety guarantees. No null pointer bugs, no buffer overflows.
   - **FFI Complexity:** LOW - Simple request/response pattern, no callbacks
   - **Impact:** Improved security, consistent hashing across platforms

2. **✅ Profile CRUD (ProfileManager)** - HIGH PRIORITY
   - **Rationale:** Complex business logic (validation, admin promotion, profile limits) should be centralized
   - **FFI Complexity:** MEDIUM - Multiple operations, but straightforward types
   - **Impact:** Consistent profile behavior across Android/iOS, easier to test

3. **✅ Storage Layer (StorageEngine trait)** - HIGH PRIORITY
   - **Rationale:** Abstract storage to allow platform-specific implementations (SharedPreferences, UserDefaults, Keychain)
   - **FFI Complexity:** MEDIUM - Trait implementation requires platform-side code
   - **Impact:** Flexible storage backends, testable in Rust

### Medium Priority Migrations

4. **✅ Authentication State (AuthManager)** - MEDIUM PRIORITY
   - **Rationale:** Centralize user scope management, prepare for future cloud auth re-enablement
   - **FFI Complexity:** LOW - Simple state queries
   - **Impact:** Easier to add real authentication later

5. **⚠️ In-Memory Caching (CachedStorage)** - MEDIUM PRIORITY
   - **Rationale:** Caching logic in Rust reduces FFI overhead (fewer cross-boundary calls)
   - **FFI Complexity:** LOW - Transparent to callers
   - **Impact:** Performance improvement, consistent cache behavior

### Keep in Native UI Layer

6. **❌ UI State Management (loading, errors)** - STAY IN NATIVE
   - **Rationale:** UI state is tightly coupled to platform UI frameworks (StateFlow, ObservableObject)
   - **FFI Complexity:** HIGH - Would require event streams across FFI
   - **Recommendation:** Keep in Kotlin ViewModel / Swift ViewModel

7. **❌ Navigation** - STAY IN NATIVE
   - **Rationale:** Navigation is platform-specific (Jetpack Navigation, SwiftUI NavigationStack)
   - **Recommendation:** Trigger navigation from native code after Rust calls complete

8. **❌ Profile Selection UI** - STAY IN NATIVE
   - **Rationale:** Platform-specific UI components (RecyclerView, List)
   - **Recommendation:** Native UI calls Rust ProfileManager for data

9. **❌ PIN Entry UI** - STAY IN NATIVE
   - **Rationale:** Platform-specific input handling, keyboard management
   - **Recommendation:** Native UI calls Rust PinManager for verification

### State Synchronization Strategy

10. **⚠️ Replace Polling with Event-Driven Sync**
    - **Current:** 2-second polling in ProfileContext
    - **Proposed:** Rust event stream via UniFFI callbacks
    - **Implementation:**
      ```rust
      // Rust SDK
      #[async_trait]
      pub trait ProfileObserver: Send + Sync {
          async fn on_profile_changed(&self, profile_id: String);
          async fn on_active_profile_changed(&self, profile_id: String);
      }

      impl ProfileManager {
          pub fn add_observer(&self, observer: Arc<dyn ProfileObserver>) { /* ... */ }
      }
      ```

      ```kotlin
      // Kotlin
      class ProfileViewModel : ProfileObserver {
          override suspend fun onProfileChanged(profileId: String) {
              // Reload profile data
              loadProfiles()
          }
      }
      ```
    - **FFI Complexity:** HIGH - Requires callback trait implementation
    - **Impact:** Eliminates 2-second latency, reduces battery drain

### Migration Sequencing

**Phase 1: Storage Foundation (Week 1-2)**
- Implement `StorageEngine` trait in Rust
- Implement platform-specific storage (SharedPreferences, UserDefaults)
- Test FFI storage operations
- **Deliverable:** Working storage abstraction with Rust + Kotlin/Swift

**Phase 2: PIN Security (Week 2-3)**
- Migrate `PinManager` to Rust
- Implement SHA-256 hashing with RustCrypto
- Implement lockout tracking
- Test PIN verification across FFI
- **Deliverable:** PIN protection working via Rust core

**Phase 3: Profile Management (Week 3-5)**
- Migrate `ProfileManager` to Rust
- Implement profile CRUD operations
- Implement validation logic (max profiles, name uniqueness, admin promotion)
- Test profile operations across FFI
- **Deliverable:** Profile management via Rust core

**Phase 4: Authentication State (Week 5-6)**
- Migrate `AuthManager` to Rust
- Implement user scope management
- Test auth state queries
- **Deliverable:** Auth state managed by Rust core

**Phase 5: Event-Driven Sync (Week 6-7)**
- Implement observer pattern in Rust
- Add UniFFI callbacks for profile changes
- Remove polling in ProfileContext
- **Deliverable:** Real-time profile sync without polling

**Phase 6: Native UI Implementation (Week 7-10)**
- Rewrite ProfilesScreen in Kotlin (Android)
- Rewrite ProfilesScreen in Swift (iOS)
- Integrate with Rust ProfileManager
- **Deliverable:** Native profile selection UI

### Risk Mitigation

**Risk 1: FFI Performance Overhead**
- **Mitigation:** Implement caching in Rust layer to minimize FFI calls
- **Benchmark:** Measure FFI call latency (target: < 1ms per call)
- **Fallback:** Keep hot paths in native code if FFI proves too slow

**Risk 2: Memory Leaks Across FFI**
- **Mitigation:** Use UniFFI's automatic memory management (Arc<> in Rust)
- **Testing:** Run Valgrind (Rust), LeakCanary (Android), Instruments (iOS)
- **Monitoring:** Add memory metrics to production builds

**Risk 3: Error Propagation**
- **Mitigation:** Use UniFFI's `[Throws]` attribute to convert Rust Result<> to platform exceptions
- **Testing:** Test all error paths in integration tests
- **UX:** Ensure native UI handles all error types gracefully

**Risk 4: Async Operations**
- **Mitigation:** UniFFI supports async Rust functions (futures → coroutines/async)
- **Testing:** Test concurrent operations across FFI
- **Deadlock Prevention:** Avoid holding locks across FFI boundary

**Risk 5: Breaking Changes**
- **Mitigation:** Run React Native and native apps in parallel during migration
- **Rollback:** Keep React Native code intact until native apps are stable
- **Feature Flags:** Use feature flags to toggle between RN and native implementations

### Testing Strategy

**Unit Tests (Rust):**
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_profile_creation() {
        let storage = MockStorage::new();
        let manager = ProfileManager::new(Arc::new(storage));

        let input = CreateProfileInput {
            name: "Test Profile".to_string(),
            profile_type: ProfileType::Adult,
            avatar_id: Some("avatar1".to_string()),
            pin: None,
        };

        let profile = manager.create_profile(input).await.unwrap();
        assert_eq!(profile.name, "Test Profile");
        assert_eq!(profile.is_admin, true); // First profile
    }

    #[tokio::test]
    async fn test_pin_verification() {
        let storage = MockStorage::new();
        let manager = PinManager::new(Arc::new(storage));

        manager.set_pin("profile1", "1234").await.unwrap();

        let result = manager.verify_pin("profile1", "1234").await.unwrap();
        assert!(matches!(result, PinVerifyResult::Success));

        let result = manager.verify_pin("profile1", "9999").await.unwrap();
        assert!(matches!(result, PinVerifyResult::Failed { .. }));
    }
}
```

**Integration Tests (Kotlin):**
```kotlin
@Test
fun testProfileCreationViaFFI() = runBlocking {
    val storage = MockStorageEngine()
    val manager = ProfileManager(storage)

    val input = CreateProfileInput(
        name = "Test Profile",
        profileType = ProfileType.ADULT,
        avatarId = "avatar1",
        pin = null
    )

    val profile = manager.createProfile(input)
    assertEquals("Test Profile", profile.name)
    assertTrue(profile.isAdmin) // First profile
}
```

**E2E Tests (Native UI):**
```kotlin
@Test
fun testPinProtectedProfileAccess() {
    // Launch ProfilesScreen
    // Tap PIN-protected profile
    // Enter correct PIN
    // Verify HomeScreen is shown
}
```

---

## Conclusion

The current authentication and profile management system in NuvioStreamingTV demonstrates **sophisticated patterns** for multi-user TV experiences:

- **MMKV native storage** with in-memory caching for performance
- **SHA-256 PIN protection** with progressive lockout
- **Profile isolation** with admin permissions and content ratings
- **Polling-based synchronization** for cross-context updates

### Migration to Rust Core Benefits

1. **Security:** Cryptographic operations in Rust with memory safety guarantees
2. **Consistency:** Single source of truth for profile logic across Android/iOS
3. **Performance:** Reduce React Native bridge overhead, optimize FFI boundary
4. **Testability:** Pure Rust business logic with platform-agnostic tests
5. **Maintainability:** Centralized business logic, platform code focuses on UI

### Recommended Approach

- **Phase 1-4 (Weeks 1-6):** Migrate core logic to Rust SDK (storage, PIN, profiles, auth)
- **Phase 5 (Weeks 6-7):** Implement event-driven sync to replace polling
- **Phase 6 (Weeks 7-10):** Build native Kotlin/Swift UIs consuming Rust core
- **Parallel Operation:** Keep React Native app running until native apps reach feature parity
- **Gradual Rollout:** Use feature flags to test native implementations with subset of users

### Next Steps

1. **Prototype Storage Abstraction:** Implement `StorageEngine` trait with UniFFI
2. **Benchmark FFI Overhead:** Measure performance impact of storage operations across FFI
3. **PIN Security Migration:** Start with PinManager as low-risk, high-value migration
4. **Integration Testing:** Set up test infrastructure for Rust + Kotlin/Swift integration
5. **ADR Documentation:** Create Architecture Decision Records for FFI strategy, state management, and migration sequencing

---

**Document Status:** ✅ Complete
**Review Status:** Pending stakeholder review
**Related Documents:**
- `state-management-map.md` - State flow analysis
- `service-layer-catalog.md` - Service architecture
- `ADR-002-ffi-binding-strategy.md` - To be created
- `ADR-003-state-management.md` - To be created
