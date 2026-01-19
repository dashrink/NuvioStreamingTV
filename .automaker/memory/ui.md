---
tags: [ui]
summary: ui implementation decisions and patterns
relevantTo: [ui]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 5
  referenced: 4
  successfulFeatures: 4
---
# ui

### Floating overlay integration within `AndroidVideoPlayer` (2026-01-18)
- **Context:** Adding chat interface to a full-screen video experience
- **Why:** Preserves video dimensions and immersion by overlaying UI rather than resizing the video container (split-screen)
- **Rejected:** Split-screen or separate tab approach
- **Trade-offs:** Chat covers video content, necessitating a minimized/bubble state implementation to reduce obstruction
- **Breaking if changed:** Changing to a separate view would require completely handling video player lifecycle management differently (PiP vs background)

#### [Pattern] Unified Theme Composable with Runtime Device Detection (2026-01-18)
- **Problem solved:** Supporting both Android Mobile and Android TV within a single application codebase using Jetpack Compose.
- **Why this works:** Encapsulates platform-specific theme implementations (androidx.tv vs androidx.compose) behind a single interface (`NuvioTheme`), allowing UI components to remain agnostic of the underlying material implementation where possible.
- **Trade-offs:** Requires runtime checks (`Configuration.UI_MODE_TYPE_TELEVISION`) and careful handling of shared vs. specific material tokens.

#### [Pattern] Hybrid Input Modifier Strategy (2026-01-18)
- **Problem solved:** Shared UI components (like `PosterCard`) needing to support D-pad navigation on TV and touch interactions on Mobile.
- **Why this works:** Combining `focusable`/`onFocusChanged` (TV) with `clickable` (Mobile) on the same composable avoids duplicating entire component definitions for different form factors.
- **Trade-offs:** Modifiers must be ordered and managed carefully to ensure visual states (focus ring vs ripple) do not conflict or render incorrectly on the wrong device.

#### [Pattern] Platform-specific Focus Engine handling in shared components (2026-01-18)
- **Problem solved:** Building `HeroCarouselView` and `PosterCard` for both iOS and tvOS
- **Why this works:** tvOS requires distinct visual feedback (scaling/borders) upon focus selection which is absent in touch-based iOS interactions
- **Trade-offs:** Increased complexity in view modifiers using conditional compilation checks

#### [Pattern] Hide custom player controls immediately upon entering Picture-in-Picture (PiP) mode (2026-01-18)
- **Problem solved:** Implementing Android PiP support in `AndroidVideoPlayer`
- **Why this works:** The PiP window is managed by the OS and is too small for standard touch-interactive controls; the OS provides its own overlay controls
- **Trade-offs:** Requires state synchronization between native PiP status and React Native UI visibility to prevent cluttered or unresponsive UI in the small window

### Adaptive root layout strategy: `NavigationSplitView` (iPad) vs `TabView` (iPhone/tvOS) (2026-01-18)
- **Context:** Accommodating different device form factors and input methods in a single codebase
- **Why:** Aligns with Apple HIG; iPad benefits from sidebar navigation for hierarchy, while iPhone and tvOS rely on tab-based top-level navigation for accessibility and focus management
- **Rejected:** Using a universal `NavigationView` (deprecated) or single `TabView` for all, which fails to utilize iPad screen real estate effectively
- **Breaking if changed:** Removing the conditional layout check breaks platform-specific UX paradigms

#### [Pattern] Decoupled View Routing via `DestinationView` resolver (2026-01-18)
- **Problem solved:** Defining where `NavigationLink` or programmatic path changes lead
- **Why this works:** Centralizes route mapping logic, allowing the `NavigationStack` to be generic `NavigationStack(path: $path) { DestinationView($0) }`, separating navigation logic from view implementation
- **Trade-offs:** Adds a layer of indirection; developers must update the resolver when adding new views

#### [Gotcha] tvOS Focus Engine limitations with standard layouts (2026-01-18)
- **Situation:** Implementing navigation on tvOS
- **Root cause:** Basic `@FocusState` handles simple grids, but complex custom layouts break the directional focus algorithm without explicit `.focusSection()` or `FocusGuide` implementations
- **How to avoid:** Requires manual focus hints in complex views, increasing UI code complexity compared to touch interfaces

### Use AVPlayerViewController with disabled native controls instead of SwiftUI's VideoPlayer or raw AVPlayerLayer (2026-01-18)
- **Context:** Implementing a video player for iOS and tvOS that requires a custom design language
- **Why:** Provides the robustness of the system player (AirPlay, PIP hooks) while allowing a fully custom SwiftUI overlay for consistent branding across platforms
- **Rejected:** SwiftUI's native `VideoPlayer` view
- **Trade-offs:** Requires manual re-implementation of basic controls (seeking, buffering state, play/pause) but grants complete visual control
- **Breaking if changed:** Re-enabling native controls would conflict with the custom overlay logic

#### [Pattern] Adaptive Grid Layouts for cross-platform support (2026-01-18)
- **Problem solved:** Building Profile and Search result screens for both iOS and tvOS
- **Why this works:** Enables a single SwiftUI view definition to adapt density based on available screen real estate (phone vs TV) without separate view hierarchies
- **Trade-offs:** Requires careful testing of grid item aspect ratios across widely different screen sizes

#### [Pattern] Use native SwiftUI `Form` and `List` components for Settings screens instead of custom layouts. (2026-01-18)
- **Problem solved:** Implementing a complex settings hierarchy with 20+ pages.
- **Why this works:** Automatically handles platform-specific navigation paradigms, accessibility behaviors, and visual consistency with the host OS (iOS vs tvOS differences).
- **Trade-offs:** Less control over exact pixel-perfect rendering compared to custom views; rigid structure.