# Gotchas & Pitfalls

Things to watch out for in this codebase.

## [2026-01-10 11:07]
ProfileContext must be wrapped in ProfileProvider at app root for useProfileContext/useActiveProfile to work. Without this, hooks will throw 'must be used within ProfileProvider' error.

_Context: When using activeProfile in hooks like useWatchProgress, ensure the app is wrapped with ProfileProvider in the root component._
