# Gotchas & Pitfalls

Things to watch out for in this codebase.

## [2026-01-09 21:21]
ActivityIndicator is imported and used directly in 30+ files - migration requires careful per-file replacement with UnifiedSpinner

_Context: Loading state migration - grep for ActivityIndicator to find all usages_
