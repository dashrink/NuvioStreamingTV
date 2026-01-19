---
tags: [testing]
summary: testing implementation decisions and patterns
relevantTo: [testing]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 7
  referenced: 7
  successfulFeatures: 7
---
# testing

#### [Gotcha] Localhost connection restrictions in CI/Test environment (2026-01-18)
- **Situation:** Running Playwright verification tests (`watch-party-verification.spec.ts`) against local dev server
- **Root cause:** The environment security policy blocks direct loopback connections, causing legitimate functional tests to fail with connection refused
- **How to avoid:** Tests must rely on pure mocking or structural verification rather than actual network integration in this specific environment

#### [Gotcha] Structural verification proxy for Xcode builds on Linux (2026-01-18)
- **Situation:** Agent operating in Linux environment attempting to verify iOS/tvOS project generation
- **Root cause:** Cannot execute xcodebuild or swift build (for Apple platforms) on Linux containers
- **How to avoid:** Verifies file existence and content presence but guarantees nothing about compilation success

### Use file integrity checks via Playwright for Native iOS code verification (2026-01-18)
- **Context:** Verifying native Swift implementation in a web-centric test automation environment
- **Why:** Playwright cannot execute or interact with iOS simulators/devices; ensuring files exist and compile is the maximum automated coverage possible without native test runners (XCTest)
- **Rejected:** Setting up XCUITest CI pipeline (too heavy for this phase)
- **Trade-offs:** Fast verification of code generation but zero functional testing of the player logic; requires manual verification steps
- **Breaking if changed:** Reliance on automation for functionality verification would fail; manual docs are required