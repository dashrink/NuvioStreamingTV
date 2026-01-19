# Archived TypeScript Services Documentation

**Archive Date:** 2026-01-18  
**Migration Phase:** 4.1 - Remove React Native Code  
**Purpose:** Historical reference for TypeScript business logic patterns

---

## Overview

This document archives the TypeScript service patterns from the React Native implementation before deletion. All functionality has been migrated to Rust SDK (nuvio-core) and native Android/iOS apps.

## Service Architecture Patterns

### 1. AccountService.ts (Authentication - DISABLED)

**Status:** Authentication was disabled in TypeScript version  
**Rust SDK Migration:** Not migrated (feature disabled)

```typescript
// Pattern: Singleton service with MMKV storage
class AccountService {
  private static instance: AccountService;

  async signInWithEmail(email: string, password: string) {
    // Disabled: returns error
  }

  async signOut() {
    await mmkvStorage.removeItem(USER_DATA_KEY);
  }
}
```

**Notes:** Authentication was disabled before migration. Future auth will be handled by native OAuth flows.

---

### 2. ProfileService.ts (Profile Management)

**Status:** ✅ Migrated to `rust-sdk/nuvio-core/src/profile/`  
**Rust SDK Equivalent:** `ProfileManager` struct

```typescript
// Pattern: Profile switching with PIN protection
class ProfileService {
  async getAllProfiles(): Promise<Profile[]>;
  async createProfile(name: string, avatarUrl?: string, pin?: string);
  async switchProfile(profileId: string, pin?: string);
  async deleteProfile(profileId: string);
  async updateProfile(profileId: string, updates: Partial<Profile>);
}
```

**Migration Notes:**

- All profile logic migrated to Rust with UniFFI bindings
- PIN protection preserved
- Profile isolation maintained

---

### 3. TraktService.ts (Trakt.tv Integration)

**Status:** ✅ Migrated to `rust-sdk/nuvio-core/src/trakt/`  
**Rust SDK Equivalent:** `TraktClient`, `TraktSync`

```typescript
// Pattern: OAuth2 + API client + sync engine
class TraktService {
  async authorize(): Promise<string>; // OAuth URL
  async handleCallback(code: string);
  async syncWatchHistory();
  async scrobble(item: Meta, progress: number);
  async getWatchedShows();
  async getWatchedMovies();
}
```

**Migration Notes:**

- OAuth2 flow migrated to Rust
- Watch history sync preserved
- Scrobbling functionality maintained

---

### 4. TMDBService.ts (TMDB Metadata)

**Status:** ✅ Migrated to `rust-sdk/nuvio-core/src/tmdb/`  
**Rust SDK Equivalent:** `TmdbClient`

```typescript
// Pattern: HTTP client + cache + image URLs
class TMDBService {
  async searchMulti(query: string);
  async getMovieDetails(tmdbId: string);
  async getTVDetails(tmdbId: string);
  async getSeasonDetails(tvId: string, seasonNumber: number);
  async getImageUrls(item: Meta);
  async getVideos(tmdbId: string); // Trailers
}
```

**Migration Notes:**

- All TMDB API calls migrated
- Image URL generation preserved
- Cache integration maintained

---

### 5. StremioService.ts (Stremio Catalog & Streaming)

**Status:** ✅ Migrated to `rust-sdk/nuvio-core/src/stremio_service/`  
**Rust SDK Equivalent:** `StremioClient`

```typescript
// Pattern: Addon management + catalog browsing + stream resolution
class StremioService {
  async getCatalogs();
  async getMetadataByImdb(imdbId: string);
  async getStreams(type: string, imdbId: string);
  async resolveStream(streamUrl: string);
  async installAddon(manifestUrl: string);
  async removeAddon(addonId: string);
}
```

**Migration Notes:**

- Addon system migrated to Rust
- Stream resolution preserved
- Catalog caching maintained

---

### 6. BackupService.ts (Backup & Restore)

**Status:** ✅ Migrated to `rust-sdk/nuvio-core/src/backup/`  
**Rust SDK Equivalent:** `BackupManager`

```typescript
// Pattern: Export/import with compression
class BackupService {
  async createBackup(): Promise<BackupData>;
  async restoreBackup(data: BackupData);
  async exportToFile(path: string);
  async importFromFile(path: string);
}

type BackupData = {
  profiles: Profile[];
  settings: Record<string, any>;
  watchHistory: WatchedItem[];
  customCatalogs: Catalog[];
  version: string;
};
```

**Migration Notes:**

- Compression algorithm migrated (gzip)
- Backup format preserved
- Cloud sync ready in Rust

---

### 7. CacheService.ts (HTTP & Metadata Cache)

**Status:** ✅ Migrated to `rust-sdk/nuvio-core/src/cache/`  
**Rust SDK Equivalent:** `CacheManager`

```typescript
// Pattern: LRU cache + TTL + disk persistence
class CacheService {
  async get<T>(key: string): Promise<T | null>;
  async set<T>(key: string, value: T, ttl?: number);
  async invalidate(key: string);
  async clear();
  async pruneExpired();
}
```

**Migration Notes:**

- LRU eviction policy preserved
- TTL management migrated
- Disk persistence via platform storage

---

### 8. NotificationService.ts (Local & Remote Notifications)

**Status:** ✅ Migrated to `rust-sdk/nuvio-core/src/notifications/`  
**Rust SDK Equivalent:** `NotificationManager`

```typescript
// Pattern: Expo notifications + scheduling
class NotificationService {
  async scheduleNotification(title: string, body: string, trigger: Date);
  async cancelNotification(id: string);
  async getAllScheduledNotifications();
  async clearAllNotifications();
}
```

**Migration Notes:**

- Scheduling logic migrated to Rust
- Platform notifications via native APIs
- Trigger system preserved

---

### 9. StorageService.ts (Key-Value Storage)

**Status:** ✅ Migrated to `rust-sdk/nuvio-core/src/cache/`  
**Rust SDK Equivalent:** Platform-agnostic storage via UniFFI

```typescript
// Pattern: MMKV wrapper with JSON serialization
class StorageService {
  async setItem(key: string, value: string);
  async getItem(key: string): Promise<string | null>;
  async removeItem(key: string);
  async getAllKeys(): Promise<string[]>;
  async clear();
}
```

**Migration Notes:**

- MMKV replaced with platform storage (SharedPreferences on Android, UserDefaults on iOS)
- JSON serialization preserved
- Same key namespace maintained

---

### 10. VideoPlayerService.ts (Player State Management)

**Status:** ✅ Migrated to Native (ExoPlayer/AVPlayer)  
**Platform Implementation:** Android: `PlayerViewModel.kt`, iOS: `PlayerViewModel.swift`

```typescript
// Pattern: Player state + controls + subtitle management
class VideoPlayerService {
  async loadVideo(url: string, subtitles?: SubtitleTrack[]);
  async play();
  async pause();
  async seekTo(position: number);
  async setPlaybackSpeed(speed: number);
  async selectAudioTrack(trackId: string);
  async selectSubtitleTrack(trackId: string);
}
```

**Migration Notes:**

- Player controls migrated to ExoPlayer (Android) and AVPlayer (iOS)
- Subtitle styling preserved
- Multi-audio support maintained

---

## UI Component Patterns (Archived for Reference)

### Focus System (TV Navigation)

**Archived Docs:** `ARCHIVED_TYPESCRIPT_DOCS/docs/FOCUS_SYSTEM.md`

Key patterns:

- D-pad navigation with focus memory
- Spatial navigation algorithms
- Focus restoration on screen re-entry

**Migration:** Implemented in Jetpack Compose (Android) and tvOS focus engine (iOS)

---

### Platform Abstraction

**Archived Docs:** `ARCHIVED_TYPESCRIPT_DOCS/PLATFORM_ABSTRACTION_PATTERN.md`

Key patterns:

- `.tv.tsx` suffix for TV-specific components
- Platform-specific imports (`Platform.select()`)
- Conditional rendering for mobile vs TV

**Migration:** Native platform separation (Android TV vs Mobile, iOS vs tvOS)

---

## Storage Keys Reference

All MMKV storage keys used in TypeScript (for migration reference):

```typescript
// Profile & Auth
'@user:data';
'@user:current';
'@profiles:all';
'@profiles:active';

// Settings
'@settings:theme';
'@settings:player';
'@settings:trakt';
'@settings:tmdb';
'@settings:parental';

// Cache
'@cache:metadata:{imdbId}';
'@cache:streams:{imdbId}';
'@cache:catalogs';
'@cache:images:{tmdbId}';

// Watch History
'@watched:movies';
'@watched:shows';
'@watched:continue';

// Trakt
'@trakt:token';
'@trakt:user';
'@trakt:sync:timestamp';

// Custom Catalogs
'@catalogs:custom';
'@catalogs:order';
```

**Migration Status:** All keys migrated to Rust SDK cache system

---

## API Endpoints Reference

### Trakt.tv

```
Base: https://api.trakt.tv/
OAuth: /oauth/authorize
Token: /oauth/token
Sync: /sync/history
Scrobble: /scrobble/start
```

### TMDB

```
Base: https://api.themoviedb.org/3/
Search: /search/multi?query={query}
Movie: /movie/{id}
TV: /tv/{id}
Season: /tv/{id}/season/{season}
Images: https://image.tmdb.org/t/p/original/{path}
```

### Stremio Addons

```
Manifest: {addonUrl}/manifest.json
Catalog: {addonUrl}/catalog/{type}/{id}.json
Meta: {addonUrl}/meta/{type}/{id}.json
Streams: {addonUrl}/stream/{type}/{id}.json
```

---

## Deprecated Services (Not Migrated)

### watchPartyService.ts

**Status:** Feature not implemented  
**Reason:** Was planned but never fully developed

### aiService.ts

**Status:** Experimental feature  
**Reason:** Not part of core functionality

### campaignService.ts

**Status:** Marketing feature  
**Reason:** Handled server-side

---

## Conclusion

All critical TypeScript business logic has been successfully migrated to:

1. **Rust SDK (nuvio-core)** - Core services (Trakt, TMDB, Stremio, Backup, Cache, Profile, Notifications)
2. **Android Native (Kotlin)** - UI components, ExoPlayer integration
3. **iOS Native (Swift)** - UI components, AVPlayer integration

This archive serves as historical reference only. The `src/` directory is safe to delete.

---

**Archived by:** OpenCode AI Agent  
**Archive Date:** 2026-01-18  
**Total Services Documented:** 10 core services + 3 deprecated
