---
tags: [ui]
summary: ui implementation decisions and patterns
relevantTo: [ui]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 0
  referenced: 0
  successfulFeatures: 0
---
# ui

### Floating overlay integration within `AndroidVideoPlayer` (2026-01-18)
- **Context:** Adding chat interface to a full-screen video experience
- **Why:** Preserves video dimensions and immersion by overlaying UI rather than resizing the video container (split-screen)
- **Rejected:** Split-screen or separate tab approach
- **Trade-offs:** Chat covers video content, necessitating a minimized/bubble state implementation to reduce obstruction
- **Breaking if changed:** Changing to a separate view would require completely handling video player lifecycle management differently (PiP vs background)