---
tags: [testing]
summary: testing implementation decisions and patterns
relevantTo: [testing]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 0
  referenced: 0
  successfulFeatures: 0
---
# testing

#### [Gotcha] Localhost connection restrictions in CI/Test environment (2026-01-18)
- **Situation:** Running Playwright verification tests (`watch-party-verification.spec.ts`) against local dev server
- **Root cause:** The environment security policy blocks direct loopback connections, causing legitimate functional tests to fail with connection refused
- **How to avoid:** Tests must rely on pure mocking or structural verification rather than actual network integration in this specific environment