---
tags: [architecture]
summary: architecture implementation decisions and patterns
relevantTo: [architecture]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 0
  referenced: 0
  successfulFeatures: 0
---
# architecture

#### [Pattern] Service-based abstraction (`WatchPartyService`) for real-time feature state management (2026-01-18)
- **Problem solved:** Implementing chat logic that needs to transition from mock data to real-time WebSockets
- **Why this works:** Decouples the UI (`WatchPartyChat`) from the transport layer, allowing the backend implementation to be swapped from mocks to WebSockets without refactoring UI components
- **Trade-offs:** Adds indirection; service must carefully manage observable state to ensure UI updates trigger correctly