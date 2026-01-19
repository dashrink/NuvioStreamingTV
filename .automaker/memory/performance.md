---
tags: [performance]
summary: performance implementation decisions and patterns
relevantTo: [performance]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 3
  referenced: 3
  successfulFeatures: 3
---
# performance

#### [Pattern] Use `LazyHStack` inside horizontal `ScrollView` for media category rows (2026-01-18)
- **Problem solved:** Rendering multiple horizontal lists of media posters in the Home Screen
- **Why this works:** Ensures efficient memory usage and rendering performance by only instantiating views as they are scrolled into view, critical for media catalogs
- **Trade-offs:** Slightly more complex state management if scrolling position needs to be preserved exactly

#### [Pattern] Prioritize magic byte signatures over file extensions for media type detection (2026-01-18)
- **Problem solved:** Scanning large user directories for media files where naming may be inconsistent
- **Why this works:** Extensions are often incorrect or missing; magic bytes (via `infer` crate) provide authoritative type definition to prevent decoder failures downstream
- **Trade-offs:** Incurs slight I/O overhead to read file headers compared to zero-cost string matching on filenames