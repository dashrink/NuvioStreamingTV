---
tags: [api]
summary: api implementation decisions and patterns
relevantTo: [api]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 6199
  referenced: 2
  successfulFeatures: 2
---
# api

### Leverage `react-native-video` metadata props to drive OS-level Media Session integration (2026-01-18)
- **Context:** Enabling lock screen and Android Auto playback controls
- **Why:** Passing `title`, `subtitle`, `artist`, and `artwork` to the video component automatically populates the Android MediaSession, avoiding the need for a separate library just for background controls
- **Rejected:** Implementing a separate native module or service for MediaSessionCompat
- **Trade-offs:** Limited to playback controls; does not support the full browsing hierarchy required for deep Android Auto integration (which needs `MediaBrowserService`)
- **Breaking if changed:** Removing metadata props disconnects the app from Android system media controls and external devices (watches, car audio)

#### [Gotcha] Rust SDK 'ProfileManager' exposed 'getWatchedHistory' but lacked explicit 'Watchlist' or 'Library' management APIs (2026-01-18)
- **Situation:** Implementing Watchlist and Library view models based on SDK capabilities
- **Root cause:** The SDK architecture treats history (tracking) and library (saved items) distinctively, or the bindings were incomplete
- **How to avoid:** Watchlist/Library features temporarily use local state/mocks, creating technical debt for future backend integration