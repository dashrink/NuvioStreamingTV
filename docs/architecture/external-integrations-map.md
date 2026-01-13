# External API Integrations Map

This document provides a comprehensive mapping of all external API integrations, data contracts, authentication mechanisms, rate limits, and error handling strategies used in the Nuvio React Native application.

## Table of Contents

1. [TMDB API](#1-tmdb-api)
2. [Trakt API](#2-trakt-api)
3. [Stremio Protocol](#3-stremio-protocol)
4. [MDBList API](#4-mdblist-api)
5. [GitHub Releases API](#5-github-releases-api)
6. [Trailer Services](#6-trailer-services)
7. [Campaign & Config API](#7-campaign--config-api)
8. [IntroDB API](#8-introdb-api)
9. [Parental Guide API](#9-parental-guide-api)
10. [AI Service (OpenRouter)](#10-ai-service-openrouter)
11. [Other APIs](#11-other-apis)

---

## 1. TMDB API

**Service File:** `src/services/tmdbService.ts`

### Base Configuration
- **Base URL:** `https://api.themoviedb.org/3`
- **Image Base URL:** `https://image.tmdb.org/t/p/`
- **Default API Key:** `d131017ccc6e5462a81c9304d21476de` (can be overridden)
- **Custom Key Support:** Yes, via MMKV storage (`tmdb_api_key`, `use_custom_tmdb_api_key`)
- **Cache TTL:** 7 days (604,800,000 ms)
- **Cache Prefix:** `tmdb_cache_`

### Authentication
- **Method:** API key as query parameter
- **Header:** `Content-Type: application/json`
- **Storage:** MMKV persistent storage
- **Configuration:**
  ```typescript
  params: {
    api_key: this.apiKey,
    ...additionalParams
  }
  ```

### Key Endpoints

#### Search & Discovery
| Endpoint | Method | Purpose | Parameters |
|----------|--------|---------|------------|
| `/search/tv` | GET | Search TV shows | `query`, `include_adult`, `language`, `page` |
| `/search/multi` | GET | Multi-content search | `query`, `include_adult`, `language`, `page` |
| `/trending/{type}/{timeWindow}` | GET | Trending content | `language` (type: movie/tv, timeWindow: day/week) |
| `/discover/{type}` | GET | Discover by filters | `language`, `sort_by`, `page`, `with_genres` |
| `/{type}/popular` | GET | Popular content | `language`, `page` |
| `/{type}/upcoming` | GET | Upcoming/On Air | `language`, `page`, `region` (for movies) |
| `/movie/now_playing` | GET | Now in theaters | `language`, `page`, `region` |

#### Metadata
| Endpoint | Method | Purpose | Append to Response |
|----------|--------|---------|-------------------|
| `/tv/{id}` | GET | TV show details | `external_ids,credits,keywords,networks` |
| `/movie/{id}` | GET | Movie details | `external_ids,credits,keywords,release_dates,production_companies` |
| `/tv/{id}/season/{season}` | GET | Season details | - |
| `/tv/{id}/season/{season}/episode/{episode}` | GET | Episode details | `credits` |
| `/find/{external_id}` | GET | Find by external ID | `external_source=imdb_id` |

#### Credits & People
| Endpoint | Method | Purpose | Parameters |
|----------|--------|---------|------------|
| `/{type}/{id}/credits` | GET | Cast & crew | `language` |
| `/person/{id}` | GET | Person details | `language` |
| `/person/{id}/movie_credits` | GET | Person's movies | `language` |
| `/person/{id}/tv_credits` | GET | Person's TV shows | `language` |
| `/person/{id}/combined_credits` | GET | All credits | `language` |

#### Images & Media
| Endpoint | Method | Purpose | Parameters |
|----------|--------|---------|------------|
| `/movie/{id}/images` | GET | Movie images | `include_image_language={lang},en,null` |
| `/tv/{id}/images` | GET | TV images | `include_image_language={lang},en,null` |
| `/collection/{id}/images` | GET | Collection images | `include_image_language={lang},en,null` |

#### External IDs & Ratings
| Endpoint | Method | Purpose | Parameters |
|----------|--------|---------|------------|
| `/tv/{id}/external_ids` | GET | Show external IDs | - |
| `/tv/{id}/season/{season}/episode/{episode}/external_ids` | GET | Episode IDs | - |
| `/movie/{id}/release_dates` | GET | Movie certifications | - |
| `/tv/{id}/content_ratings` | GET | TV content ratings | - |

#### Genres & Collections
| Endpoint | Method | Purpose | Parameters |
|----------|--------|---------|------------|
| `/genre/movie/list` | GET | Movie genres | `language` |
| `/genre/tv/list` | GET | TV genres | `language` |
| `/collection/{id}` | GET | Collection details | `language` |

#### Recommendations
| Endpoint | Method | Purpose | Parameters |
|----------|--------|---------|------------|
| `/{type}/{id}/recommendations` | GET | Content recommendations | `language` |

### Data Contracts

#### TMDBShow
```typescript
interface TMDBShow {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  last_air_date: string;
  number_of_seasons: number;
  number_of_episodes: number;
  genres?: { id: number; name: string }[];
  seasons: {
    id: number;
    name: string;
    season_number: number;
    episode_count: number;
    poster_path: string | null;
    air_date: string;
  }[];
  status?: string;
  episode_run_time?: number[];
  type?: string;
  origin_country?: string[];
  original_language?: string;
  created_by?: { id: number; name: string; profile_path?: string | null }[];
  networks?: { id: number; name: string; logo_path: string | null; origin_country: string }[];
}
```

#### TMDBEpisode
```typescript
interface TMDBEpisode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  air_date: string;
  vote_average: number;
  imdb_id?: string;
  imdb_rating?: number;
  season_poster_path?: string | null;
  runtime?: number;
}
```

#### TMDBTrendingResult
```typescript
interface TMDBTrendingResult {
  id: number;
  title?: string;      // For movies
  name?: string;       // For TV shows
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;      // For movies
  first_air_date?: string;    // For TV shows
  genre_ids: number[];
  external_ids?: {
    imdb_id: string | null;
    [key: string]: any;
  };
}
```

### Rate Limits
- **Official Limit:** 40 requests per 10 seconds per IP
- **Implementation:** Uses caching to minimize API calls
- **Retry Logic:** Single retry with exponential backoff (base delay: 1000ms)

### Error Handling
```typescript
// Returns empty array or null on errors
try {
  const response = await axios.get(url, { headers, params });
  return response.data;
} catch (error) {
  return null; // or []
}
```

### Caching Strategy
- **Local Cache:** MMKV storage with 7-day TTL
- **Cache Key Generation:** Hash-based unique keys from endpoint + params
- **Cache Invalidation:** Manual via `clearAllCache()` or automatic on expiry
- **Null Caching:** Errors/not found results are NOT cached (will retry)

### Image Sizes
- `original` - Full resolution
- `w500` - 500px width
- `w300` - 300px width
- `w185` - 185px width
- `profile` - Profile images

---

## 2. Trakt API

**Service File:** `src/services/traktService.ts`

### Base Configuration
- **Base URL:** `https://api.trakt.tv`
- **Client ID:** `process.env.EXPO_PUBLIC_TRAKT_CLIENT_ID`
- **Client Secret:** `process.env.EXPO_PUBLIC_TRAKT_CLIENT_SECRET`
- **Redirect URI:** `process.env.EXPO_PUBLIC_TRAKT_REDIRECT_URI` (default: `nuvio://auth/trakt`)
- **API Version:** VIP (requires authentication)

### Authentication
- **Method:** OAuth 2.0 Authorization Code Flow
- **Storage Keys:**
  - `trakt_access_token`
  - `trakt_refresh_token`
  - `trakt_token_expiry`
- **Token Refresh:** Automatic before expiry
- **Authorization URL:** `https://trakt.tv/oauth/authorize`

#### OAuth Flow
```typescript
// 1. Get authorization URL
const authUrl = `https://trakt.tv/oauth/authorize?response_type=code&client_id=${TRAKT_CLIENT_ID}&redirect_uri=${encodeURIComponent(TRAKT_REDIRECT_URI)}`;

// 2. Exchange code for tokens
POST /oauth/token
{
  code: string,
  client_id: string,
  client_secret: string,
  redirect_uri: string,
  grant_type: 'authorization_code'
}

// 3. Refresh token
POST /oauth/token
{
  refresh_token: string,
  client_id: string,
  client_secret: string,
  redirect_uri: string,
  grant_type: 'refresh_token'
}
```

### Key Endpoints

#### User Data
| Endpoint | Method | Purpose | Authentication |
|----------|--------|---------|----------------|
| `/users/settings` | GET | User settings & profile | Required |
| `/sync/watchlist/{type}` | GET | User watchlist | Required |
| `/sync/watched/{type}` | GET | Watch history | Required |
| `/sync/collection/{type}` | GET | User collection | Required |
| `/sync/ratings/{type}` | GET | User ratings | Required |
| `/sync/playback` | GET | Playback progress | Required |

#### Scrobbling
| Endpoint | Method | Purpose | Body |
|----------|--------|---------|------|
| `/scrobble/start` | POST | Start watching | `{ movie/episode, progress, app_version, app_date }` |
| `/scrobble/pause` | POST | Pause playback | `{ movie/episode, progress }` |
| `/scrobble/stop` | POST | Stop/finish watching | `{ movie/episode, progress }` |

#### Sync Operations
| Endpoint | Method | Purpose | Body |
|----------|--------|---------|------|
| `/sync/history` | POST | Add to watch history | `{ movies/episodes: [{...}] }` |
| `/sync/history/remove` | POST | Remove from history | `{ movies/episodes: [{...}] }` |
| `/sync/watchlist` | POST | Add to watchlist | `{ movies/shows: [{...}] }` |
| `/sync/watchlist/remove` | POST | Remove from watchlist | `{ movies/shows: [{...}] }` |
| `/sync/collection` | POST | Add to collection | `{ movies/shows: [{...}] }` |
| `/sync/collection/remove` | POST | Remove from collection | `{ movies/shows: [{...}] }` |

### Data Contracts

#### TraktWatchedItem
```typescript
interface TraktWatchedItem {
  movie?: {
    title: string;
    year: number;
    ids: { trakt: number; slug: string; imdb: string; tmdb: number; };
    images?: TraktImages;
  };
  show?: {
    title: string;
    year: number;
    ids: { trakt: number; slug: string; imdb: string; tmdb: number; };
    images?: TraktImages;
  };
  plays: number;
  last_watched_at: string;
  last_updated_at?: string;
  reset_at?: string | null;
  seasons?: {
    number: number;
    episodes: {
      number: number;
      plays: number;
      last_watched_at: string;
    }[];
  }[];
}
```

#### TraktPlaybackItem
```typescript
interface TraktPlaybackItem {
  progress: number;
  paused_at: string;
  id: number;
  type: 'movie' | 'episode';
  movie?: { /* ... */ };
  episode?: {
    season: number;
    number: number;
    title: string;
    ids: { trakt: number; tvdb?: number; imdb?: string; tmdb?: number; };
  };
  show?: { /* ... */ };
}
```

### Rate Limits
- **VIP Tier:** 10,000 requests per day (unlimited for VIP apps)
- **Implementation:** No explicit rate limiting (relies on VIP status)
- **Retry Logic:** Exponential backoff (base: 1000ms, max: 5 retries)

### Error Handling
```typescript
// Comprehensive error handling with retries
private async retryRequest<T>(request: () => Promise<T>, retries = 5): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await request();
    } catch (error) {
      if (attempt === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
    }
  }
  throw new Error('Max retries exceeded');
}
```

### Sync Strategy
- **Last Sync Tracking:** Stores `last_sync` timestamp per data type
- **Incremental Sync:** Only fetches changes since last sync
- **Conflict Resolution:** Server timestamp wins

---

## 3. Stremio Protocol

**Service File:** `src/services/stremioService.ts`

### Base Configuration
- **Protocol Version:** Stremio Addon Protocol v1
- **Default Addons:**
  - Cinemeta: `https://v3-cinemeta.strem.io`
  - OpenSubtitles v3: `https://opensubtitles-v3.strem.io`
- **Storage Keys:**
  - `stremio-addons` - Installed addons
  - `stremio-addon-order` - Addon priority order
  - `user_removed_addons` - User-removed addon tombstones

### Protocol Resources
- `catalog` - Content catalogs
- `meta` - Metadata
- `stream` - Streaming sources
- `subtitles` - Subtitle files
- `addon_catalog` - Addon discovery

### Manifest Structure
```typescript
interface Manifest {
  id: string;
  name: string;
  version: string;
  description: string;
  url?: string;
  originalUrl?: string;
  catalogs?: Catalog[];
  resources?: ResourceObject[];
  types?: string[];
  idPrefixes?: string[];
  manifestVersion?: string;
  queryParams?: string;
  behaviorHints?: {
    configurable?: boolean;
    configurationRequired?: boolean;
    adult?: boolean;
    p2p?: boolean;
  };
  config?: ConfigObject[];
}
```

### Key Endpoints (Per Addon)

#### Manifest
```
GET /{addonUrl}/manifest.json
```

#### Catalog
```
GET /{addonUrl}/catalog/{type}/{id}.json
GET /{addonUrl}/catalog/{type}/{id}/{extraArgs}.json
```
**Extra Args Format:** `genre=Action&skip=100` (URL-encoded, in path)

#### Metadata
```
GET /{addonUrl}/meta/{type}/{id}.json
```

#### Streams
```
GET /{addonUrl}/stream/{type}/{id}.json
```

#### Subtitles
```
GET /{addonUrl}/subtitles/{type}/{id}.json
GET /{addonUrl}/subtitles/series/{imdbId}:{season}:{episode}.json
```

### Data Contracts

#### Stream Object
```typescript
interface Stream {
  // Source (one required)
  url?: string;                    // Direct HTTP(S)/RTMP URL
  ytId?: string;                   // YouTube video ID
  infoHash?: string;               // BitTorrent info hash
  externalUrl?: string;            // External browser URL

  // Archive sources
  rarUrls?: SourceObject[];
  zipUrls?: SourceObject[];
  '7zipUrls'?: SourceObject[];

  // Selection
  fileIdx?: number;
  fileMustInclude?: string;

  // Display
  name?: string;
  description?: string;

  // Metadata
  addon?: string;
  addonId?: string;
  addonName?: string;
  size?: number;
  isFree?: boolean;
  isDebrid?: boolean;

  // Embedded subtitles
  subtitles?: Subtitle[];

  // Behavior hints
  behaviorHints?: {
    bingeGroup?: string;
    notWebReady?: boolean;
    countryWhitelist?: string[];
    cached?: boolean;
    proxyHeaders?: { request?: Record<string, string>; response?: Record<string, string>; };
    videoHash?: string;
    videoSize?: number;
    filename?: string;
  };
}
```

#### Subtitle Object
```typescript
interface Subtitle {
  id: string;              // Required
  url: string;
  lang: string;
  fps?: number;
  addon?: string;
  addonName?: string;
  format?: 'srt' | 'vtt' | 'ass' | 'ssa';
}
```

### Rate Limits
- **No Universal Limit:** Varies per addon
- **Implementation:** Concurrent request limiting (max 3 per addon)
- **Timeout:** 10 seconds (60 seconds for Torrentio/debrid)

### Error Handling
```typescript
// Graceful degradation - continues with other addons on failure
try {
  const response = await axios.get(url, { timeout: 10000 });
  return response.data;
} catch (error) {
  logger.error('Addon request failed:', error);
  return null; // Continue with next addon
}
```

### Addon Discovery
- **Dynamic Type Support:** Queries addons for supported content types
- **ID Prefix Matching:** Validates content IDs against addon capabilities
- **Priority Ordering:** User-configurable addon priority

---

## 4. MDBList API

**Service File:** `src/services/mdblistService.ts`

### Base Configuration
- **Base URL:** `https://api.mdblist.com`
- **API Key Storage:** `mdblist_api_key` (MMKV)
- **Enabled Storage:** `mdblist_enabled` (MMKV)
- **Cache:** In-memory Map (session-based)

### Authentication
- **Method:** API key as query parameter
- **Header:** `Content-Type: application/json`
- **Configuration:**
  ```typescript
  GET /rating/{mediaType}/{ratingType}?apikey={apiKey}
  ```

### Endpoint

#### Get Ratings
```
POST /rating/{mediaType}/{ratingType}?apikey={apiKey}

mediaType: 'movie' | 'show'
ratingType: 'trakt' | 'imdb' | 'tmdb' | 'letterboxd' | 'tomatoes' | 'audience' | 'metacritic'

Body:
{
  "ids": ["tt1234567"],
  "provider": "imdb"
}

Response:
{
  "ratings": [{
    "rating": 8.5
  }]
}
```

### Data Contract
```typescript
interface MDBListRatings {
  trakt?: number;
  imdb?: number;
  tmdb?: number;
  letterboxd?: number;
  tomatoes?: number;      // Rotten Tomatoes
  audience?: number;      // RT Audience Score
  metacritic?: number;
}
```

### Rate Limits
- **Unknown:** Not documented
- **Implementation:** Parallel fetching of all rating types

### Error Handling
```typescript
// 403 errors for invalid API keys are logged throttled (every 5th attempt or 10 min)
if (response.status === 403) {
  this.apiKeyErrorCount++;
  if (this.apiKeyErrorCount === 1 || this.apiKeyErrorCount % 5 === 0 ||
      now - this.lastApiKeyErrorTime > 600000) {
    logger.error('[MDBListService] API Key rejected');
    this.lastApiKeyErrorTime = now;
  }
}
```

### Caching Strategy
- **Session Cache:** In-memory Map
- **Negative Caching:** Stores `null` for "not found" to prevent repeated requests
- **Invalidation:** On API key change or manual `clearCache()`

---

## 5. GitHub Releases API

**Service File:** `src/services/githubReleaseService.ts`

### Base Configuration
- **Repository:** `tapframe/NuvioStreaming`
- **Base URL:** `https://api.github.com/repos/tapframe/NuvioStreaming`
- **User Agent:** `Nuvio/{Platform.OS}`

### Authentication
- **Method:** None (public API)
- **Headers:**
  ```typescript
  {
    'Accept': 'application/vnd.github+json',
    'User-Agent': `Nuvio/${Platform.OS}`
  }
  ```

### Endpoints

#### Latest Release
```
GET /releases/latest

Response:
{
  tag_name: string;
  name?: string;
  body?: string;
  html_url?: string;
  published_at?: string;
}
```

#### All Releases
```
GET /releases

Response: Array<{
  tag_name: string;
  assets: Array<{
    download_count: number;
    ...
  }>;
  ...
}>
```

#### Contributors
```
GET /contributors

Response: Array<{
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  contributions: number;
  type: string;
}>
```

### Rate Limits
- **Unauthenticated:** 60 requests per hour per IP
- **Implementation:** No caching, direct requests
- **Mitigation:** Minimal calls, user-initiated only

### Error Handling
```typescript
try {
  const res = await fetch(url, { headers });
  if (!res.ok) return null;
  return await res.json();
} catch {
  return null;
}
```

---

## 6. Trailer Services

**Service File:** `src/services/trailerService.ts`

### Configuration
- **Local Server Base:** `process.env.EXPO_PUBLIC_TRAILER_LOCAL_BASE` (default: `http://46.62.173.157:3001`)
- **XPrime URL:** `process.env.EXPO_PUBLIC_XPRIME_URL` (default: `https://db.xprime.tv/trailers`)
- **Timeout:** 20 seconds
- **Fallback:** Local server → XPrime on failure

### Endpoints

#### Local Server (Auto-Search)
```
GET /search-trailer?title={title}&year={year}&tmdbId={tmdbId}&type={type}

Response:
{
  "url": "https://..."
}
```

#### Local Server (Direct YouTube)
```
GET /trailer?youtube_url={url}&title={title}&year={year}

Response:
{
  "url": "https://..."
}
```

#### XPrime API
```
GET /trailers?title={title}&year={year}

Response: (plain text URL)
"https://..."
```

### Valid Domains
- `theplatform.com`
- `youtube.com`, `youtu.be`, `googlevideo.com`
- `vimeo.com`, `dailymotion.com`, `twitch.tv`
- `amazonaws.com`, `cloudfront.net`

### Error Handling
```typescript
// Timeout and network error handling
try {
  const response = await fetch(url, { signal: controller.signal });
  if (!response.ok) {
    logger.warn(`Trailer fetch failed: ${response.status}`);
    return null;
  }
  return await response.json();
} catch (error) {
  if (error.name === 'AbortError') {
    logger.warn('Request timed out after 20s');
  }
  return null; // Triggers XPrime fallback
}
```

---

## 7. Campaign & Config API

**Service Files:**
- `src/services/campaignService.ts`
- `src/services/configService.ts`

### Base Configuration
- **Base URL:** `process.env.EXPO_PUBLIC_CAMPAIGN_API_URL` (default: `http://localhost:3000`)
- **Cache TTL:** 5 minutes (campaigns)

### Endpoints

#### Campaign Queue
```
GET /api/campaigns/queue?platform={ios|android}

Response: Array<Campaign>
```

#### Config
```
GET /api/config?key={configKey}&t={timestamp}

Headers:
{
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
}

Response: Object (config data)
```

### Data Contracts

#### Campaign
```typescript
type Campaign = {
  id: string;
  type: 'poster_modal' | 'banner' | 'bottom_sheet';
  content: {
    title?: string;
    message?: string;
    mediaType?: 'image' | 'video';
    imageUrl?: string;
    videoUrl?: string;
    backgroundColor?: string;
    textColor?: string;
    primaryAction?: CampaignAction;
    secondaryAction?: CampaignAction;
  };
  rules: {
    startDate?: string;
    endDate?: string;
    maxImpressions?: number;
    minVersion?: string;
    maxVersion?: string;
    platforms?: string[];
    priority: number;
    showOncePerSession?: boolean;
    showOncePerUser?: boolean;
  };
};
```

### Caching & Tracking
- **Session Tracking:** In-memory Set for session impressions
- **User Tracking:** MMKV storage for `campaign_seen_{id}` and `campaign_impression_{id}`
- **Queue Management:** Campaigns fetched and cached in priority order

---

## 8. IntroDB API

**Service File:** `src/services/introService.ts`

### Base Configuration
- **Base URL:** `process.env.EXPO_PUBLIC_INTRODB_API_URL`
- **Timeout:** 5 seconds
- **Documentation:** https://api.introdb.app

### Endpoint

#### Get Intro Timestamps
```
GET /intro?imdb_id={imdbId}&season={season}&episode={episode}

Response:
{
  imdb_id: string;
  season: number;
  episode: number;
  start_sec: number;
  end_sec: number;
  start_ms: number;
  end_ms: number;
  confidence: number;
}
```

### Error Handling
```typescript
// 404 is expected for episodes without intro data
if (axios.isAxiosError(error) && error.response?.status === 404) {
  logger.log('No intro data available');
  return null;
}
```

---

## 9. Parental Guide API

**Service File:** `src/services/parentalGuideService.ts`

### Base Configuration
- **Base URL:** `process.env.EXPO_PUBLIC_PARENTAL_GUIDE_API_URL` (default: `https://parental.nuvioapp.space`)
- **Timeout:** 5 seconds
- **Cache:** In-memory Map (session-based)

### Endpoints

#### Movie Parental Guide
```
GET /movie/{imdbId}

Response:
{
  imdbId: string;
  parentalGuide: ParentalGuide;
  hasData: boolean;
}
```

#### TV Episode Parental Guide
```
GET /tv/{imdbId}/{season}/{episode}

Response:
{
  imdbId: string;
  parentalGuide: ParentalGuide;
  hasData: boolean;
  seriesId?: string;
  season?: number;
  episode?: number;
}
```

### Data Contract
```typescript
interface ParentalGuide {
  nudity: 'None' | 'Mild' | 'Moderate' | 'Severe';
  violence: 'None' | 'Mild' | 'Moderate' | 'Severe';
  profanity: 'None' | 'Mild' | 'Moderate' | 'Severe';
  alcohol: 'None' | 'Mild' | 'Moderate' | 'Severe';
  frightening: 'None' | 'Mild' | 'Moderate' | 'Severe';
}
```

### Caching Strategy
- **Session Cache:** In-memory Map with keys `movie:{imdbId}` or `tv:{imdbId}:{season}:{episode}`
- **Manual Invalidation:** Via `clearCache()`

---

## 10. AI Service (OpenRouter)

**Service File:** `src/services/aiService.ts`

### Base Configuration
- **Base URL:** `https://openrouter.ai/api/v1`
- **HTTP Referer:** `https://nuvio.app`

### Endpoint

#### Chat Completions
```
POST /chat/completions

Headers:
{
  'Authorization': 'Bearer {apiKey}',
  'Content-Type': 'application/json',
  'HTTP-Referer': 'https://nuvio.app'
}

Body:
{
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}
```

### Authentication
- **Method:** Bearer token
- **Storage:** User-provided API key (not stored in service)

---

## 11. Other APIs

### OMDB API (Legacy)
**File:** `src/services/tmdbService.ts` (deprecated method)
- **Base URL:** `http://www.omdbapi.com/`
- **API Key:** `20e793df`
- **Purpose:** Episode ratings (replaced by EXPO_PUBLIC_IMDB_RATINGS_API_BASE_URL)
- **Status:** Deprecated in favor of custom IMDb ratings API

### IMDb Ratings API
**File:** `src/services/tmdbService.ts`
- **Base URL:** `process.env.EXPO_PUBLIC_IMDB_RATINGS_API_BASE_URL`
- **Endpoint:** `/api/shows/{tmdbId}/season-ratings`
- **Purpose:** Season and episode ratings
- **Cache:** 7-day TTL in MMKV

### OTA Updates
**File:** `src/services/updateService.ts`
- **URL:** `https://ota.nuvioapp.space/api/manifest`
- **Purpose:** Over-the-air app updates
- **Method:** Expo Updates API

---

## Summary Table

| Service | Base URL | Auth Method | Rate Limit | Caching | Retry Logic |
|---------|----------|-------------|------------|---------|-------------|
| TMDB | api.themoviedb.org | API Key (query) | 40/10s | 7 days | 1 retry |
| Trakt | api.trakt.tv | OAuth 2.0 | 10k/day (VIP) | Incremental sync | 5 retries |
| Stremio | (per addon) | None | Varies | Session | 1 retry |
| MDBList | api.mdblist.com | API Key (query) | Unknown | Session | None |
| GitHub | api.github.com | None | 60/hour | None | None |
| Trailers | Custom + XPrime | None | Unknown | None | Fallback |
| Campaign | Custom | None | N/A | 5 min | None |
| IntroDB | Custom | None | Unknown | None | None |
| Parental | parental.nuvioapp.space | None | Unknown | Session | None |
| OpenRouter | openrouter.ai | Bearer token | Varies | None | None |

---

## Environment Variables Reference

```bash
# TMDB
# (Uses default API key, custom key stored in MMKV)

# Trakt
EXPO_PUBLIC_TRAKT_CLIENT_ID=<client_id>
EXPO_PUBLIC_TRAKT_CLIENT_SECRET=<client_secret>
EXPO_PUBLIC_TRAKT_REDIRECT_URI=nuvio://auth/trakt

# Trailers
EXPO_PUBLIC_TRAILER_LOCAL_BASE=http://46.62.173.157:3001
EXPO_PUBLIC_TRAILER_LOCAL_TRAILER_PATH=/trailer
EXPO_PUBLIC_TRAILER_LOCAL_SEARCH_PATH=/search-trailer
EXPO_PUBLIC_XPRIME_URL=https://db.xprime.tv/trailers

# Campaign & Config
EXPO_PUBLIC_CAMPAIGN_API_URL=http://localhost:3000

# IntroDB
EXPO_PUBLIC_INTRODB_API_URL=<api_url>

# Parental Guide
EXPO_PUBLIC_PARENTAL_GUIDE_API_URL=https://parental.nuvioapp.space

# IMDb Ratings
EXPO_PUBLIC_IMDB_RATINGS_API_BASE_URL=<api_url>
```

---

## Error Handling Patterns

### Pattern 1: Graceful Degradation
```typescript
// Used in: Stremio, Trailers
try {
  const primary = await fetchPrimary();
  return primary;
} catch {
  const fallback = await fetchFallback();
  return fallback || null;
}
```

### Pattern 2: Retry with Exponential Backoff
```typescript
// Used in: TMDB, Trakt, Stremio
for (let i = 0; i < retries; i++) {
  try {
    return await request();
  } catch (error) {
    if (i === retries - 1) throw error;
    await sleep(baseDelay * Math.pow(2, i));
  }
}
```

### Pattern 3: Silent Failure
```typescript
// Used in: Campaigns, GitHub, IntroDB
try {
  const data = await fetch(url);
  return data;
} catch {
  return null; // Non-critical, don't throw
}
```

### Pattern 4: User Notification
```typescript
// Used in: Trakt OAuth, MDBList
if (error.status === 403) {
  // Throttled logging for user-facing errors
  if (shouldNotifyUser()) {
    logger.error('API Key invalid');
  }
}
```

---

## Migration Considerations

### For Native iOS/Android
1. **HTTP Cleartext:** Some APIs use HTTP (local servers) - requires `NSAppTransportSecurity` (iOS) or `android:usesCleartextTraffic` (Android)
2. **OAuth Deep Links:** Trakt redirect URI must be registered as URL scheme
3. **Background Sync:** Trakt sync can leverage background tasks
4. **Certificate Pinning:** Consider for TMDB/Trakt in production

### For Web
1. **CORS:** Will need proxy for some APIs (TMDB, Trakt, MDBList)
2. **OAuth:** Redirect handling differs from deep links
3. **Local Storage:** Replace MMKV with localStorage/IndexedDB
4. **File System:** Stremio addon storage needs web alternative

### API Key Security
- **TMDB:** Default key is public, custom keys stored locally
- **Trakt:** Client ID/Secret should be in secure env, not bundled
- **MDBList:** User-provided, stored in MMKV
- **OpenRouter:** User-provided, not persisted

---

**Document Version:** 1.0
**Last Updated:** 2026-01-13
**Maintained By:** Architecture Analysis Task
