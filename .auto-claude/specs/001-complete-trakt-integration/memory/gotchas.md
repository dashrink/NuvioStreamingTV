# Gotchas & Pitfalls

Things to watch out for in this codebase.

## [2026-01-10 11:07]
StreamingContent.type is 'movie' or 'series', but Trakt API expects 'movie' or 'show'. TypeScript cast `as 'movie' | 'show'` does NOT convert the value at runtime - use ternary `item.type === 'movie' ? 'movie' : 'show'` instead.

_Context: ContentItem.tsx and any component calling Trakt watchlist/collection/rating functions with StreamingContent items_
