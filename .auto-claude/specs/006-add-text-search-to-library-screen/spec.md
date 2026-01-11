# Add Text Search to Library Screen

## Overview

Add a search/filter input field to LibraryScreen that allows users to search their library items by title. Currently, the library only filters by type (movies/series/trakt) but doesn't support text-based search within items.

## Rationale

SearchScreen has a complete search implementation with debounced input, recent searches, and skeleton loaders (src/components/search/). LibraryScreen already has type filtering (filter state on line 224) and a filteredItems computed value. The search pattern from SearchScreen can be directly applied to filter libraryItems by title.

---
*This spec was created from ideation and is pending detailed specification.*
