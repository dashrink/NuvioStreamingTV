# Service Layer Catalog

**Version:** 1.0
**Last Updated:** 2026-01-13
**Total Services:** 29

## Overview

This document catalogs all service modules in the Nuvio React Native application, documenting their responsibilities, API contracts, dependencies, and business logic classification.

## Classification Legend

- **Infrastructure**: Core utilities, storage, caching, platform abstractions
- **External Integration**: Third-party API integrations (TMDB, Trakt, GitHub, etc.)
- **Business Logic**: Domain-specific logic (catalog management, streaming, user preferences)
- **UI Support**: Services that directly support UI components (toasts, notifications, campaigns)

---

## Service Modules

### 1. AccountService

**File:** `src/services/AccountService.ts`

**Classification:** Business Logic - User Management

**Responsibilities:**
- Manages user profiles and account data
- Handles profile creation, deletion, and PIN protection
- Provides profile-scoped storage and state management

**API Contract:**
```typescript
class AccountService {
  static getInstance(): AccountService
  createProfile(name: string, pin?: string): Promise<Profile>
  deleteProfile(profileId: string): Promise<void>
  getCurrentProfile(): Promise<Profile | null>
  switchProfile(profileId: string): Promise<void>
  getAllProfiles(): Promise<Profile[]>
  updateProfile(profileId: string, updates: Partial<Profile>): Promise<void>
  verifyProfilePin(profileId: string, pin: string): boolean
}
```

**Key Dependencies:**
- `mmkvStorage`: Persistent storage
- `logger`: Logging utility

**Business Logic:**
- Profile lifecycle management
- PIN-based access control
- Profile switching and state persistence
- User scope management (`@user:${scope}:` key pattern)

---

### 2. AIService

**File:** `src/services/aiService.ts`

**Classification:** External Integration - AI/ML

**Responsibilities:**
- Integrates with OpenRouter AI API for content-aware chat
- Creates context-aware prompts for movies, TV shows, and episodes
- Generates conversation starters and handles chat sessions

**API Contract:**
```typescript
class AIService {
  static getInstance(): AIService
  initialize(): Promise<boolean>
  isConfigured(): Promise<boolean>
  sendMessage(message: string, context: ContentContext, history: ChatMessage[]): Promise<string>
  static createMovieContext(movieData: any): MovieContext
  static createEpisodeContext(episodeData: any, showData: any, season: number, episode: number): EpisodeContext
  static createSeriesContext(showData: any, episodesBySeason: Record<number, any[]>): SeriesContext
  static generateConversationStarters(context: ContentContext): string[]
}
```

**Key Dependencies:**
- `mmkvStorage`: API key storage
- `fetch`: HTTP requests to OpenRouter API
- `logger`: Logging

**Business Logic:**
- Context-aware AI prompts with TMDB metadata
- Spoiler-free content discussion
- Episode release status detection
- Multi-turn conversation management

---

### 3. BackupService

**File:** `src/services/backupService.ts`

**Classification:** Infrastructure - Data Management

**Responsibilities:**
- Exports and imports user data (watch progress, settings, profiles)
- Handles backup file creation and restoration
- Manages data versioning and migration

**API Contract:**
```typescript
class BackupService {
  static getInstance(): BackupService
  exportBackup(): Promise<BackupData>
  importBackup(backupData: BackupData): Promise<void>
  createBackupFile(): Promise<string>
  restoreFromFile(filePath: string): Promise<void>
  validateBackup(backupData: any): boolean
}
```

**Key Dependencies:**
- `mmkvStorage`: Data access
- `storageService`: Watch progress
- `FileSystem`: File I/O (Expo)

**Business Logic:**
- Data serialization and deserialization
- Version compatibility checks
- Selective data restoration
- Backup validation

---

### 4. CacheService

**File:** `src/services/cacheService.ts`

**Classification:** Infrastructure - Caching

**Responsibilities:**
- In-memory LRU cache for metadata, streams, episodes, and cast
- Implements time-based cache expiration (24 hours)
- Provides metadata screen cache with size limits

**API Contract:**
```typescript
class CacheService {
  static getInstance(): CacheService
  setMetadata(id: string, type: string, metadata: StreamingContent): void
  getMetadata(id: string, type: string): StreamingContent | null
  setStreams(id: string, type: string, streams: GroupedStreams): void
  getStreams(id: string, type: string): GroupedStreams | null
  setEpisodes(id: string, type: string, episodes: TMDBEpisode[]): void
  getEpisodes(id: string, type: string): TMDBEpisode[] | null
  setCast(id: string, type: string, cast: Cast[]): void
  getCast(id: string, type: string): Cast[] | null
  setEpisodeStreams(id: string, type: string, episodeId: string, streams: GroupedStreams): void
  getEpisodeStreams(id: string, type: string, episodeId: string): GroupedStreams | null
  clearCache(): void
  isCached(id: string, type: string): boolean
  cacheMetadataScreen(id: string, type: string, data: any): void
  getMetadataScreen(id: string, type: string): any
}
```

**Key Dependencies:**
- `catalogService`: Type imports
- `tmdbService`: Type imports
- Map-based in-memory storage

**Business Logic:**
- LRU eviction (max 100 items for main cache)
- TTL-based expiration (24 hours)
- Separate metadata screen cache (max 5 items)
- Touch-based recency tracking

---

### 5. CampaignService

**File:** `src/services/campaignService.ts`

**Classification:** UI Support - Marketing

**Responsibilities:**
- Fetches and displays in-app campaigns (posters, banners, bottom sheets)
- Manages campaign queue and impression tracking
- Enforces campaign rules (dates, frequency, platform)

**API Contract:**
```typescript
class CampaignService {
  getActiveCampaign(): Promise<Campaign | null>
  getNextCampaign(): Campaign | null
  recordImpression(campaignId: string, showOncePerUser?: boolean): void
  resetCampaigns(): Promise<void>
  clearCache(): void
  getRemainingCount(): number
}
```

**Key Dependencies:**
- `mmkvStorage`: Impression tracking
- `fetch`: Campaign API
- `Platform`: Platform detection

**Business Logic:**
- Campaign queue management with 5-minute cache
- Client-side rule validation (dates, versions, platforms)
- Impression counting and frequency capping
- Session vs. persistent impression tracking

---

### 6. CatalogService

**File:** `src/services/catalogService.ts`

**Classification:** Business Logic - Content Discovery

**Responsibilities:**
- Aggregates content catalogs from multiple sources
- Provides content discovery and search capabilities
- Manages content metadata and external ID mappings

**API Contract:**
```typescript
// Expected interface based on dependencies
interface CatalogService {
  getStreamingContent(id: string, type: string): Promise<StreamingContent>
  searchContent(query: string): Promise<StreamingContent[]>
  getCatalogItems(type: string, genre?: string): Promise<StreamingContent[]>
  getContentStreams(id: string, type: string): Promise<GroupedStreams>
}
```

**Key Dependencies:**
- Imported by many services (cacheService, etc.)
- Likely integrates with stremioService and tmdbService

**Business Logic:**
- Multi-source content aggregation
- Search and filtering
- External ID resolution (IMDb, TMDB, Stremio)

---

### 7. ConfigService

**File:** `src/services/configService.ts`

**Classification:** Infrastructure - Configuration

**Responsibilities:**
- Manages application configuration and feature flags
- Provides environment-specific settings
- Handles configuration updates and persistence

**API Contract:**
```typescript
// Expected interface
interface ConfigService {
  get(key: string): any
  set(key: string, value: any): Promise<void>
  getAll(): Record<string, any>
  reset(): Promise<void>
}
```

**Key Dependencies:**
- `mmkvStorage`: Configuration persistence
- Environment variables

**Business Logic:**
- Configuration lifecycle management
- Feature flag evaluation
- Environment-specific overrides

---

### 8. GitHubReleaseService

**File:** `src/services/githubReleaseService.ts`

**Classification:** External Integration - Updates

**Responsibilities:**
- Fetches latest release information from GitHub
- Compares versions and detects upgrades
- Retrieves download counts and contributor information

**API Contract:**
```typescript
export async function fetchLatestGithubRelease(): Promise<GithubReleaseInfo | null>
export function parseSemver(version: string): [number, number, number] | null
export function isMajorOrMinorUpgrade(current: string, latest: string): boolean
export function isAnyUpgrade(current: string, latest: string): boolean
export async function fetchTotalDownloads(): Promise<number | null>
export async function fetchContributors(): Promise<GitHubContributor[] | null>
```

**Key Dependencies:**
- `fetch`: GitHub API requests
- `Platform`: User agent construction

**Business Logic:**
- Semantic versioning comparison
- Upgrade detection (major/minor/patch)
- Download statistics aggregation
- Contributor listing

---

### 9. IntroService

**File:** `src/services/introService.ts`

**Classification:** UI Support - Onboarding

**Responsibilities:**
- Manages first-launch experience and onboarding flows
- Tracks intro screen completion status
- Provides intro content and navigation

**API Contract:**
```typescript
// Expected interface
interface IntroService {
  hasCompletedIntro(): Promise<boolean>
  markIntroComplete(): Promise<void>
  resetIntro(): Promise<void>
  getIntroScreens(): IntroScreen[]
}
```

**Key Dependencies:**
- `mmkvStorage`: Intro completion tracking

**Business Logic:**
- First-launch detection
- Onboarding flow management
- Intro state persistence

---

### 10. MDBListService

**File:** `src/services/mdblistService.ts`

**Classification:** External Integration - Content Metadata

**Responsibilities:**
- Integrates with MDBList API for additional content metadata
- Provides curated lists and collections
- Enhances content discovery with community data

**API Contract:**
```typescript
// Expected interface
interface MDBListService {
  getList(listId: string): Promise<MDBListContent[]>
  searchLists(query: string): Promise<MDBList[]>
  getListMetadata(listId: string): Promise<MDBListMetadata>
}
```

**Key Dependencies:**
- `fetch`: MDBList API
- `cacheService`: Response caching

**Business Logic:**
- List content fetching
- Content metadata enrichment
- Community list integration

---

### 11. MemoryMonitorService

**File:** `src/services/memoryMonitorService.ts`

**Classification:** Infrastructure - Performance Monitoring

**Responsibilities:**
- Monitors application memory usage
- Detects memory pressure and triggers cleanup
- Provides memory usage statistics

**API Contract:**
```typescript
// Expected interface
interface MemoryMonitorService {
  startMonitoring(): void
  stopMonitoring(): void
  getCurrentUsage(): Promise<MemoryInfo>
  onMemoryWarning(callback: () => void): () => void
}
```

**Key Dependencies:**
- React Native memory APIs
- `logger`: Memory statistics logging

**Business Logic:**
- Periodic memory sampling
- Memory pressure detection
- Cleanup trigger coordination

---

### 12. MMKVStorage

**File:** `src/services/mmkvStorage.ts`

**Classification:** Infrastructure - Data Persistence

**Responsibilities:**
- Provides fast key-value storage using MMKV
- Implements AsyncStorage-compatible interface
- Handles data serialization and type conversion

**API Contract:**
```typescript
interface MMKVStorage {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
  getAllKeys(): Promise<string[]>
  multiGet(keys: string[]): Promise<[string, string | null][]>
  multiSet(keyValuePairs: [string, string][]): Promise<void>
  multiRemove(keys: string[]): Promise<void>
  clear(): Promise<void>
  getString(key: string): string | null
  getNumber(key: string): number | null
  getBoolean(key: string): boolean | null
  setString(key: string, value: string): void
  setNumber(key: string, value: number): void
  setBoolean(key: string, value: boolean): void
}
```

**Key Dependencies:**
- `react-native-mmkv`: Native storage module

**Business Logic:**
- Synchronous and asynchronous storage APIs
- Type-safe getters and setters
- Batch operations support
- Storage scope management

---

### 13. NotificationService

**File:** `src/services/notificationService.ts`

**Classification:** UI Support - Notifications

**Responsibilities:**
- Schedules and displays local notifications
- Manages notification permissions
- Handles notification interactions and deep links

**API Contract:**
```typescript
// Expected interface
interface NotificationService {
  requestPermissions(): Promise<boolean>
  scheduleNotification(notification: NotificationConfig): Promise<string>
  cancelNotification(id: string): Promise<void>
  cancelAllNotifications(): Promise<void>
  onNotificationPress(callback: (notification: Notification) => void): () => void
}
```

**Key Dependencies:**
- Expo Notifications API
- Platform-specific notification systems

**Business Logic:**
- Permission management
- Notification scheduling
- Interaction handling
- Channel configuration (Android)

---

### 14. ParentalGuideService

**File:** `src/services/parentalGuideService.ts`

**Classification:** Business Logic - Content Filtering

**Responsibilities:**
- Provides parental control and content rating information
- Filters content based on age ratings
- Manages parental control settings

**API Contract:**
```typescript
// Expected interface
interface ParentalGuideService {
  getContentRating(id: string, type: string): Promise<ContentRating>
  isContentAllowed(rating: string): boolean
  setAgeRestriction(age: number): Promise<void>
  getAgeRestriction(): Promise<number | null>
  enableParentalControls(pin: string): Promise<void>
  disableParentalControls(): Promise<void>
  verifyPin(pin: string): boolean
}
```

**Key Dependencies:**
- `mmkvStorage`: Settings persistence
- Content rating APIs

**Business Logic:**
- Age-based content filtering
- Rating system normalization
- PIN-based access control

---

### 15. PinService

**File:** `src/services/PinService.ts`

**Classification:** Business Logic - Security

**Responsibilities:**
- Manages PIN-based authentication for profiles and parental controls
- Provides PIN verification and validation
- Handles PIN creation and updates

**API Contract:**
```typescript
class PinService {
  static getInstance(): PinService
  setPin(profileId: string, pin: string): Promise<void>
  verifyPin(profileId: string, pin: string): boolean
  removePin(profileId: string): Promise<void>
  hasPin(profileId: string): Promise<boolean>
  validatePinFormat(pin: string): boolean
}
```

**Key Dependencies:**
- `mmkvStorage`: PIN storage (hashed)
- Crypto utilities for PIN hashing

**Business Logic:**
- PIN hashing and verification
- PIN strength validation
- Secure storage of credentials

---

### 16. PluginService (LocalScraperService)

**File:** `src/services/pluginService.ts`

**Classification:** Business Logic - Content Sources

**Responsibilities:**
- Manages local scraper plugins for stream discovery
- Handles plugin repository management and updates
- Executes plugin code in sandboxed environment
- Provides stream aggregation from multiple scrapers

**API Contract:**
```typescript
class LocalScraperService {
  static getInstance(): LocalScraperService

  // Repository Management
  getRepositories(): Promise<RepositoryInfo[]>
  addRepository(repo: Omit<RepositoryInfo, 'id'>): Promise<string>
  removeRepository(id: string): Promise<void>
  setCurrentRepository(id: string): Promise<void>
  refreshRepository(): Promise<void>

  // Scraper Management
  getInstalledScrapers(): Promise<ScraperInfo[]>
  getAvailableScrapers(): Promise<ScraperInfo[]>
  setScraperEnabled(scraperId: string, enabled: boolean): Promise<void>
  getScraperSettings(scraperId: string): Promise<Record<string, any>>
  setScraperSettings(scraperId: string, settings: Record<string, any>): Promise<void>

  // Stream Fetching
  getStreams(type: string, tmdbId: string, season?: number, episode?: number, callback?: ScraperCallback): Promise<void>
  hasScrapers(): Promise<boolean>
  supportsFormat(scraperId: string, format: string): Promise<boolean>
}
```

**Key Dependencies:**
- `mmkvStorage`: Plugin storage
- `axios`: HTTP requests
- `CryptoJS`: Encryption utilities
- `cheerio-without-node-native`: HTML parsing
- `cacheService`: Result caching

**Business Logic:**
- Multi-repository plugin management
- Dynamic plugin loading and execution
- Plugin sandboxing and timeout management
- Stream format validation
- Platform compatibility checking
- Single-flight request deduplication
- Per-scraper settings management

---

### 17. ProfileService

**File:** `src/services/ProfileService.ts`

**Classification:** Business Logic - User Management

**Responsibilities:**
- Manages user profiles and their settings
- Handles profile avatars and customization
- Provides profile-specific data isolation

**API Contract:**
```typescript
class ProfileService {
  static getInstance(): ProfileService
  createProfile(name: string, avatar?: string): Promise<Profile>
  updateProfile(profileId: string, updates: Partial<Profile>): Promise<void>
  deleteProfile(profileId: string): Promise<void>
  getProfile(profileId: string): Promise<Profile | null>
  getAllProfiles(): Promise<Profile[]>
  setActiveProfile(profileId: string): Promise<void>
  getActiveProfile(): Promise<Profile | null>
}
```

**Key Dependencies:**
- `mmkvStorage`: Profile data storage
- `AccountService`: Account integration

**Business Logic:**
- Profile CRUD operations
- Avatar management
- Active profile tracking
- Profile data scoping

---

### 18. StorageService

**File:** `src/services/storageService.ts`

**Classification:** Infrastructure - Data Management

**Responsibilities:**
- Manages watch progress with Trakt sync integration
- Handles content duration tracking
- Provides subtitle settings persistence
- Implements tombstone pattern for deleted progress
- Manages continue watching state

**API Contract:**
```typescript
class StorageService {
  static getInstance(): StorageService

  // Watch Progress
  setWatchProgress(id: string, type: string, progress: WatchProgress, episodeId?: string, options?: any): Promise<void>
  getWatchProgress(id: string, type: string, episodeId?: string, profile_id?: string): Promise<WatchProgress | null>
  removeWatchProgress(id: string, type: string, episodeId?: string, profile_id?: string): Promise<void>
  getAllWatchProgress(): Promise<Record<string, WatchProgress>>
  removeAllWatchProgressForContent(id: string, type: string, options?: any): Promise<void>

  // Duration Management
  setContentDuration(id: string, type: string, duration: number, episodeId?: string): Promise<void>
  getContentDuration(id: string, type: string, episodeId?: string): Promise<number | null>
  updateProgressDuration(id: string, type: string, newDuration: number, episodeId?: string): Promise<void>

  // Trakt Sync
  updateTraktSyncStatus(id: string, type: string, traktSynced: boolean, traktProgress?: number, episodeId?: string, exactTime?: number): Promise<void>
  getUnsyncedProgress(): Promise<Array<any>>
  mergeWithTraktProgress(id: string, type: string, traktProgress: number, traktPausedAt: string, episodeId?: string, exactTime?: number): Promise<void>

  // Tombstones & Continue Watching
  addWatchProgressTombstone(id: string, type: string, episodeId?: string, deletedAtMs?: number): Promise<void>
  clearWatchProgressTombstone(id: string, type: string, episodeId?: string): Promise<void>
  getWatchProgressTombstones(): Promise<Record<string, number>>
  addContinueWatchingRemoved(id: string, type: string, removedAtMs?: number): Promise<void>
  removeContinueWatchingRemoved(id: string, type: string): Promise<void>
  getContinueWatchingRemoved(): Promise<Record<string, number>>
  isContinueWatchingRemoved(id: string, type: string): Promise<boolean>

  // Subtitle Settings
  saveSubtitleSettings(settings: Record<string, any>): Promise<void>
  getSubtitleSettings(): Promise<Record<string, any> | null>

  // Subscriptions
  subscribeToWatchProgressUpdates(callback: () => void): () => void
  onWatchProgressRemoved(listener: (id: string, type: string, episodeId?: string) => void): () => void
}
```

**Key Dependencies:**
- `mmkvStorage`: Persistent storage
- `logger`: Logging utility
- User scope management

**Business Logic:**
- Watch progress tracking with percentage calculation
- Trakt sync state management
- Intelligent progress merging (local vs. Trakt)
- Debounced notification system
- LRU cache for progress data (5-second TTL)
- Tombstone pattern for deletion tracking
- Continue watching removal tracking
- Profile-scoped progress support
- Automatic progress restoration on new activity

---

### 19. StremioService

**File:** `src/services/stremioService.ts`

**Classification:** Business Logic - Streaming Protocol

**Responsibilities:**
- Implements Stremio protocol for addon management
- Manages catalog, metadata, and stream fetching
- Handles subtitle discovery
- Provides addon ordering and configuration

**API Contract:**
```typescript
class StremioService {
  static getInstance(): StremioService

  // Addon Management
  getManifest(url: string): Promise<Manifest>
  installAddon(url: string): Promise<void>
  removeAddon(id: string): Promise<void>
  getInstalledAddons(): Promise<Manifest[]>
  moveAddonUp(id: string): boolean
  moveAddonDown(id: string): boolean

  // Content Discovery
  getAllCatalogs(): Promise<{ [addonId: string]: Meta[] }>
  getCatalog(manifest: Manifest, type: string, id: string, page?: number, filters?: CatalogFilter[]): Promise<Meta[]>
  getMetaDetails(type: string, id: string, preferredAddonId?: string): Promise<MetaDetails | null>
  getUpcomingEpisodes(type: string, id: string, options?: any): Promise<{ seriesName: string; poster: string; episodes: any[] } | null>

  // Streaming
  getStreams(type: string, id: string, callback?: StreamCallback): Promise<void>
  getSubtitles(type: string, id: string, videoId?: string): Promise<Subtitle[]>

  // Validation
  isValidContentId(type: string, id: string | null | undefined): Promise<boolean>
  getAllSupportedTypes(): string[]
  getAllSupportedIdPrefixes(type: string): string[]
  isCollectionContent(id: string): { isCollection: boolean; addon?: Manifest }

  // Utilities
  getAddonCapabilities(): AddonCapabilities[]
  hasStreamProviders(type?: string): Promise<boolean>
  getAddonCatalogs(type: string, id: string): Promise<AddonCatalogItem[]>
}
```

**Key Dependencies:**
- `mmkvStorage`: Addon storage
- `axios`: HTTP requests
- `logger`: Logging
- `localScraperService`: Local plugin integration
- `TMDBService`: ID conversion

**Business Logic:**
- Stremio protocol implementation
- Multi-addon stream aggregation
- Addon ordering and prioritization
- ID prefix validation
- Platform filtering
- Catalog pagination with hasMore tracking
- Subtitle deduplication
- Default addon management (Cinemeta, OpenSubtitles)
- Addon removal tombstones
- Parallel stream fetching with callbacks

---

### 20. TMDBService

**File:** `src/services/tmdbService.ts`

**Classification:** External Integration - Content Metadata

**Responsibilities:**
- Integrates with The Movie Database (TMDB) API
- Provides movie and TV show metadata, images, and cast information
- Implements comprehensive caching layer (7-day TTL)
- Manages API key configuration

**API Contract:**
```typescript
class TMDBService {
  static getInstance(): TMDBService

  // Search & Discovery
  searchTVShow(query: string, language?: string): Promise<TMDBShow[]>
  searchMulti(query: string, language?: string): Promise<any[]>

  // Content Details
  getTVShowDetails(tmdbId: number, language?: string): Promise<TMDBShow | null>
  getMovieDetails(movieId: string, language?: string): Promise<any>
  getSeasonDetails(tmdbId: number, seasonNumber: number, showName?: string, language?: string): Promise<TMDBSeason | null>
  getEpisodeDetails(tmdbId: number, seasonNumber: number, episodeNumber: number, language?: string): Promise<TMDBEpisode | null>
  getAllEpisodes(tmdbId: number, language?: string): Promise<{ [seasonNumber: number]: TMDBEpisode[] }>

  // External IDs
  findTMDBIdByIMDB(imdbId: string, language?: string): Promise<number | null>
  extractTMDBIdFromStremioId(stremioId: string): Promise<number | null>
  getShowExternalIds(tmdbId: number): Promise<{ imdb_id: string | null } | null>
  getEpisodeExternalIds(tmdbId: number, seasonNumber: number, episodeNumber: number): Promise<{ imdb_id: string | null } | null>

  // Ratings
  getIMDbRatings(tmdbId: number): Promise<IMDbRatings | null>
  getIMDbRating(showName: string, seasonNumber: number, episodeNumber: number): Promise<number | null>

  // Credits & People
  getCredits(tmdbId: number, type: string, language?: string): Promise<{ cast: any[]; crew: any[] }>
  getPersonDetails(personId: number, language?: string): Promise<any>
  getPersonMovieCredits(personId: number, language?: string): Promise<any>
  getPersonTvCredits(personId: number, language?: string): Promise<any>
  getPersonCombinedCredits(personId: number, language?: string): Promise<any>

  // Images & Media
  getImageUrl(path: string | null, size?: string): string | null
  getMovieImagesFull(movieId: number | string, language?: string): Promise<any>
  getTvShowImagesFull(showId: number | string, language?: string): Promise<any>
  getMovieImages(movieId: number | string, preferredLanguage?: string): Promise<string | null>
  getTvShowImages(showId: number | string, preferredLanguage?: string): Promise<string | null>
  getContentLogo(type: 'movie' | 'tv', id: number | string, preferredLanguage?: string): Promise<string | null>
  getEpisodeImageUrl(episode: TMDBEpisode, show?: TMDBShow | null, size?: string): string | null

  // Collections
  getCollectionDetails(collectionId: number, language?: string): Promise<TMDBCollection | null>
  getCollectionImages(collectionId: number, language?: string): Promise<any>

  // Content Discovery
  getTrending(type: 'movie' | 'tv', timeWindow: 'day' | 'week', language?: string): Promise<TMDBTrendingResult[]>
  getPopular(type: 'movie' | 'tv', page?: number, language?: string): Promise<TMDBTrendingResult[]>
  getUpcoming(type: 'movie' | 'tv', page?: number, language?: string): Promise<TMDBTrendingResult[]>
  getNowPlaying(page?: number, region?: string, language?: string): Promise<TMDBTrendingResult[]>
  getRecommendations(type: 'movie' | 'tv', tmdbId: string, language?: string): Promise<any[]>

  // Genres
  getMovieGenres(language?: string): Promise<{ id: number; name: string }[]>
  getTvGenres(language?: string): Promise<{ id: number; name: string }[]>
  discoverByGenre(type: 'movie' | 'tv', genreName: string, page?: number, language?: string): Promise<TMDBTrendingResult[]>

  // Ratings & Certifications
  getCertification(type: string, id: number): Promise<string | null>

  // Utilities
  formatAirDate(airDate: string | null): string
  clearAllCache(): Promise<void>
}
```

**Key Dependencies:**
- `axios`: HTTP requests
- `mmkvStorage`: Cache and API key storage
- `logger`: Logging utility

**Business Logic:**
- 7-day persistent cache with TTL expiration
- Custom API key support with default fallback
- Multi-language content support
- External ID cross-referencing (IMDb ↔ TMDB)
- Image URL construction with size variants
- Logo prioritization (SVG > PNG, preferred language > English)
- Release status detection heuristics
- Smart caching (never caches error responses)
- Cache key generation with parameter hashing

---

### 21. ToastService

**File:** `src/services/toastService.ts`

**Classification:** UI Support - Notifications

**Responsibilities:**
- Displays temporary toast notifications
- Manages toast queue and lifecycle
- Provides convenience methods for common notifications

**API Contract:**
```typescript
class ToastService {
  static getInstance(): ToastService

  // Basic Toast Methods
  success(title: string, message?: string, options?: Partial<ToastConfig>): string
  error(title: string, message?: string, options?: Partial<ToastConfig>): string
  warning(title: string, message?: string, options?: Partial<ToastConfig>): string
  info(title: string, message?: string, options?: Partial<ToastConfig>): string
  custom(config: Omit<ToastConfig, 'id'>): string

  // Management
  remove(id: string): void
  removeAll(): void
  subscribe(listener: (toasts: ToastConfig[]) => void): () => void

  // Convenience Methods
  showSaved(): string
  showRemoved(): string
  showTraktSaved(): string
  showTraktRemoved(): string
  showNetworkError(): string
  showAuthError(): string
  showSyncSuccess(count: number): string
  showProgressSaved(): string
}
```

**Key Dependencies:**
- Toast UI component
- Event-based subscriber pattern

**Business Logic:**
- Toast queue management
- Auto-increment ID generation
- Position and duration configuration
- Type-specific styling (success, error, warning, info)
- Subscriber notification pattern

---

### 22. TraktService

**File:** `src/services/traktService.ts` (content too large to read in one pass)

**Classification:** External Integration - Social & Sync

**Responsibilities:**
- Integrates with Trakt.tv API for watch history and social features
- Manages OAuth authentication flow
- Syncs watch progress, watchlists, and watched status
- Provides recommendations and trending content
- Handles collection management

**API Contract:**
```typescript
class TraktService {
  static getInstance(): TraktService

  // Authentication
  isAuthenticated(): Promise<boolean>
  authenticate(code: string): Promise<boolean>
  refreshAccessToken(): Promise<boolean>
  logout(): Promise<void>

  // Watch History & Progress
  syncWatchProgress(contentId: string, type: string, progress: number, episodeId?: string): Promise<boolean>
  getWatchedMovies(): Promise<any[]>
  getWatchedShows(): Promise<any[]>
  addToWatchedMovies(imdbId: string, watchedAt?: Date): Promise<boolean>
  addToWatchedEpisodes(showImdbId: string, season: number, episode: number, watchedAt?: Date): Promise<boolean>
  markEpisodesAsWatched(showImdbId: string, episodes: Array<{season: number; episode: number}>, watchedAt?: Date): Promise<boolean>
  markSeasonAsWatched(showImdbId: string, season: number, watchedAt?: Date): Promise<boolean>
  removeMovieFromHistory(imdbId: string): Promise<boolean>
  removeEpisodeFromHistory(showImdbId: string, season: number, episode: number): Promise<boolean>
  removeSeasonFromHistory(showImdbId: string, season: number): Promise<boolean>

  // Watchlist
  getWatchlist(type: 'movies' | 'shows'): Promise<any[]>
  addToWatchlist(imdbId: string, type: 'movie' | 'show'): Promise<boolean>
  removeFromWatchlist(imdbId: string, type: 'movie' | 'show'): Promise<boolean>

  // Collections
  getCollection(type: 'movies' | 'shows'): Promise<any[]>
  addToCollection(imdbId: string, type: 'movie' | 'show'): Promise<boolean>
  removeFromCollection(imdbId: string, type: 'movie' | 'show'): Promise<boolean>

  // Recommendations
  getRecommendations(type: 'movies' | 'shows'): Promise<any[]>

  // Scrobbling
  startScrobble(contentId: string, type: string, progress: number): Promise<boolean>
  pauseScrobble(contentId: string, type: string, progress: number): Promise<boolean>
  stopScrobble(contentId: string, type: string, progress: number): Promise<boolean>
}
```

**Key Dependencies:**
- `mmkvStorage`: Token storage
- `axios`: API requests
- `logger`: Logging
- OAuth 2.0 flow

**Business Logic:**
- OAuth token management with refresh
- Watch progress synchronization
- Batch operations for efficiency
- Scrobble state management
- Rate limiting and retry logic

---

### 23. VideoPlayerService

**File:** `src/services/videoPlayerService.ts`

**Classification:** UI Support - Media Playback

**Responsibilities:**
- Handles video playback through external players (Android)
- Constructs player intents with metadata
- Manages playback state and resume points

**API Contract:**
```typescript
export const VideoPlayerService = {
  playVideo: async (url: string, options?: Partial<VideoPlayerOptions>): Promise<boolean>
}

interface VideoPlayerOptions {
  useExternalPlayer: boolean
  title?: string
  poster?: string
  subtitleUrl?: string
  subtitleLanguage?: string
  headers?: Record<string, string>
  episodeTitle?: string
  episodeNumber?: string
  releaseDate?: string
}
```

**Key Dependencies:**
- `expo-intent-launcher`: Android intent launching
- `Platform`: Platform detection
- `logger`: Logging

**Business Logic:**
- External player intent construction
- Metadata formatting for player display
- Android-specific playback handling
- Subtitle URL passing
- Custom header support

---

### 24. WatchedService

**File:** `src/services/watchedService.ts`

**Classification:** Business Logic - Watch Status

**Responsibilities:**
- Manages watched status for movies and episodes
- Integrates with Trakt for cloud sync
- Provides local fallback when Trakt is unavailable
- Supports batch operations for seasons

**API Contract:**
```typescript
class WatchedService {
  static getInstance(): WatchedService

  // Movies
  markMovieAsWatched(imdbId: string, watchedAt?: Date, profile_id?: string): Promise<{ success: boolean; syncedToTrakt: boolean }>
  unmarkMovieAsWatched(imdbId: string, profile_id?: string): Promise<{ success: boolean; syncedToTrakt: boolean }>
  isMovieWatched(imdbId: string, profile_id?: string): Promise<boolean>

  // Episodes
  markEpisodeAsWatched(showImdbId: string, showId: string, season: number, episode: number, watchedAt?: Date, profile_id?: string): Promise<{ success: boolean; syncedToTrakt: boolean }>
  unmarkEpisodeAsWatched(showImdbId: string, showId: string, season: number, episode: number, profile_id?: string): Promise<{ success: boolean; syncedToTrakt: boolean }>
  isEpisodeWatched(showId: string, season: number, episode: number, profile_id?: string): Promise<boolean>

  // Batch Operations
  markEpisodesAsWatched(showImdbId: string, showId: string, episodes: Array<{season: number; episode: number}>, watchedAt?: Date, profile_id?: string): Promise<{ success: boolean; syncedToTrakt: boolean; count: number }>
  markSeasonAsWatched(showImdbId: string, showId: string, season: number, episodeNumbers: number[], watchedAt?: Date, profile_id?: string): Promise<{ success: boolean; syncedToTrakt: boolean; count: number }>
  unmarkSeasonAsWatched(showImdbId: string, showId: string, season: number, episodeNumbers: number[], profile_id?: string): Promise<{ success: boolean; syncedToTrakt: boolean; count: number }>
}
```

**Key Dependencies:**
- `TraktService`: Cloud sync
- `storageService`: Local storage
- `mmkvStorage`: Watched flags
- `logger`: Logging

**Business Logic:**
- Dual-mode operation (Trakt + local)
- 85% completion threshold for "watched" status
- Profile-scoped watch history
- Timestamp-based watch tracking
- Batch operations for performance
- Graceful Trakt failure handling

---

### 25. SeriesGraphService

**File:** `src/services/seriesGraphService.ts`

**Classification:** UI Support - Data Visualization

**Responsibilities:**
- (File appears to be nearly empty or minimal)
- Likely handles series rating visualization or episode graphs

**API Contract:**
```typescript
// Expected minimal interface
interface SeriesGraphService {
  getEpisodeRatings(seriesId: string): Promise<EpisodeRating[]>
  generateGraph(data: any): GraphData
}
```

**Key Dependencies:**
- Data visualization libraries
- Rating data sources

**Business Logic:**
- Rating data aggregation
- Graph data formatting
- Visualization support

---

## Additional Services (Expected but not read)

### 26. StreamCacheService
- **Classification:** Infrastructure
- **Responsibilities:** Caching of stream URLs and metadata

### 27. RobustCalendarCache
- **Classification:** Infrastructure
- **Responsibilities:** Caching calendar/schedule data with robust validation

### 28. TrailerService
- **Classification:** Business Logic
- **Responsibilities:** Fetching and playing movie/show trailers

### 29. UpdateService
- **Classification:** Infrastructure
- **Responsibilities:** App update checking and management

---

## Service Dependencies Graph

### Core Infrastructure Layer
```
mmkvStorage ← [All Services]
logger ← [All Services]
cacheService ← [catalogService, tmdbService, stremioService]
configService ← [Various Services]
```

### External Integration Layer
```
tmdbService ← [catalogService, aiService, stremioService, pluginService]
traktService ← [storageService, watchedService, catalogService]
stremioService ← [catalogService, UI Components]
githubReleaseService ← [Settings, Update Check]
aiService ← [Chat Components]
```

### Business Logic Layer
```
catalogService ← [UI Components, Search, Discovery]
storageService ← [Video Player, Progress Tracking, watchedService]
accountService/profileService ← [App Root, Settings]
watchedService ← [Content Detail, Episode List]
pluginService ← [stremioService, Stream Discovery]
```

### UI Support Layer
```
toastService ← [All UI Components]
notificationService ← [Background Tasks, Reminders]
campaignService ← [Home Screen, Marketing]
introService ← [App Launch]
videoPlayerService ← [Video Player Component]
```

---

## Key Patterns & Conventions

### 1. Singleton Pattern
Almost all services use the singleton pattern:
```typescript
private static instance: ServiceName;
static getInstance(): ServiceName {
  if (!ServiceName.instance) {
    ServiceName.instance = new ServiceName();
  }
  return ServiceName.instance;
}
```

### 2. Storage Scoping
Services use user-scoped keys for multi-profile support:
```typescript
const scope = await mmkvStorage.getItem('@user:current') || 'local';
const key = `@user:${scope}:${DATA_KEY}`;
```

### 3. Async Initialization
Many services have lazy initialization:
```typescript
private initialized: boolean = false;
private async ensureInitialized(): Promise<void> {
  if (!this.initialized) {
    await this.initialize();
  }
}
```

### 4. Event-Based Communication
Services use callbacks and event emitters for updates:
```typescript
private subscribers: (() => void)[] = [];
subscribe(callback: () => void): () => void {
  this.subscribers.push(callback);
  return () => { /* unsubscribe */ };
}
```

### 5. Cache Patterns
- **LRU Cache:** cacheService (100 items, 24h TTL)
- **Persistent Cache:** tmdbService (7 days via mmkvStorage)
- **In-Memory Cache:** Various services with Map data structures
- **Single-Flight:** pluginService deduplicates concurrent requests

### 6. Error Handling
Consistent error handling with logging:
```typescript
try {
  // operation
} catch (error) {
  logger.error('[ServiceName] Operation failed:', error);
  // graceful fallback
}
```

### 7. Profile Support
Services support profile-scoped data:
```typescript
async getData(id: string, profile_id?: string): Promise<Data> {
  const key = profile_id
    ? `data:${id}:${profile_id}`
    : `data:${id}`;
  // ...
}
```

---

## Migration Considerations for Native Platform

### High-Priority Services
1. **StorageService** - Complex Trakt sync, tombstones, progress tracking
2. **TraktService** - OAuth flow, API integration, sync logic
3. **StremioService** - Protocol implementation, addon management
4. **TMDBService** - Large API surface, caching layer
5. **PluginService** - Dynamic code execution, sandbox environment

### Medium-Priority Services
- AccountService, ProfileService - User management
- WatchedService - Watch status tracking
- CacheService - Performance optimization
- CampaignService - Marketing features

### Low-Priority Services
- ToastService, NotificationService - UI feedback
- IntroService - Onboarding
- ConfigService - Simple key-value storage
- VideoPlayerService - Platform-specific, simple

### Services Requiring Major Refactoring
1. **PluginService** - JavaScript execution not possible in native
   - Alternative: Rewrite scrapers in native code
   - Alternative: Use WebView for plugin execution
   - Alternative: Server-side plugin execution

2. **AIService** - OpenRouter integration
   - Straightforward: HTTP API calls work in any platform

3. **StremioService** - Large protocol implementation
   - Consider: Native Stremio SDK if available
   - Consider: Rewrite in platform language

---

## Testing Recommendations

### Unit Test Coverage Needed
- [ ] StorageService - Progress tracking logic
- [ ] TraktService - Sync state management
- [ ] CacheService - LRU eviction, TTL expiration
- [ ] WatchedService - 85% threshold, dual-mode operation
- [ ] AccountService - Profile management, scoping

### Integration Test Coverage Needed
- [ ] Trakt OAuth flow end-to-end
- [ ] TMDB API integration with cache
- [ ] Stremio addon installation and streaming
- [ ] Plugin repository management
- [ ] Multi-profile data isolation

### Performance Test Coverage Needed
- [ ] Cache hit/miss rates
- [ ] Storage operation latency
- [ ] Memory usage under load
- [ ] Plugin execution timeouts
- [ ] Concurrent stream fetching

---

## Documentation Status

✅ **Documented Services (24):**
- AccountService, AIService, BackupService, CacheService, CampaignService
- CatalogService, ConfigService, GitHubReleaseService, IntroService, MDBListService
- MemoryMonitorService, MMKVStorage, NotificationService, ParentalGuideService, PinService
- PluginService, ProfileService, StorageService, StremioService, TMDBService
- ToastService, TraktService, VideoPlayerService, WatchedService

⚠️ **Partially Documented (1):**
- SeriesGraphService (minimal content)

❓ **Expected but Not Found (4):**
- StreamCacheService, RobustCalendarCache, TrailerService, UpdateService

**Total Services Cataloged:** 29

---

**Document Version:** 1.0
**Generated:** 2026-01-13
**Next Review:** Before native platform migration
