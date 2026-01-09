/**
 * useProfileFiltering - Hook for filtering content based on profile settings
 * Provides memoized filtering with performance optimization
 */

import { useMemo, useCallback } from 'react';
import { useProfile } from '../contexts/ProfileContext';
import {
  filterContentForProfile,
  isContentAllowed,
  getContentRestrictionLabel,
  shouldShowContentWarning,
  getFilteredContentStats,
  createContentFilter,
  normalizeRating,
} from '../utils/contentFilter';
import { Profile } from '../types/profile';

interface ContentItem {
  certification?: string;
  rating?: string;
}

interface FilteredResult<T> {
  data: T[];
  totalCount: number;
  filteredCount: number;
  blockedCount: number;
  isFiltered: boolean;
}

/**
 * Hook for filtering content arrays based on active profile settings
 */
export function useProfileFiltering<T extends ContentItem>(content: T[]): FilteredResult<T> {
  const { activeProfile, isKidsMode } = useProfile();

  return useMemo(() => {
    const stats = getFilteredContentStats(content, activeProfile);
    return {
      data: stats.filtered,
      totalCount: stats.totalCount,
      filteredCount: stats.filteredCount,
      blockedCount: stats.blockedCount,
      isFiltered: stats.blockedCount > 0,
    };
  }, [content, activeProfile]);
}

/**
 * Hook for creating a reusable content filter function
 * Useful when you need to filter multiple arrays with the same profile
 */
export function useContentFilter() {
  const { activeProfile } = useProfile();

  return useMemo(() => createContentFilter(activeProfile), [activeProfile]);
}

/**
 * Hook for checking if a single content item is allowed
 */
export function useContentAllowed<T extends ContentItem>(content: T | null | undefined): boolean {
  const { activeProfile } = useProfile();

  return useMemo(() => {
    if (!content) return true;
    return isContentAllowed(content, activeProfile);
  }, [content, activeProfile]);
}

/**
 * Hook for checking if content should show a warning
 */
export function useContentWarning<T extends ContentItem>(
  content: T | null | undefined
): boolean {
  const { activeProfile } = useProfile();

  return useMemo(() => {
    if (!content) return false;
    return shouldShowContentWarning(content, activeProfile);
  }, [content, activeProfile]);
}

/**
 * Hook for getting the current content restriction label
 */
export function useContentRestrictionLabel(): string {
  const { activeProfile } = useProfile();

  return useMemo(() => getContentRestrictionLabel(activeProfile), [activeProfile]);
}

/**
 * Hook for getting the kids mode status
 */
export function useKidsMode(): {
  isKidsMode: boolean;
  restrictionLabel: string;
  profile: Profile | null;
} {
  const { activeProfile, isKidsMode } = useProfile();
  const restrictionLabel = useMemo(
    () => getContentRestrictionLabel(activeProfile),
    [activeProfile]
  );

  return {
    isKidsMode,
    restrictionLabel,
    profile: activeProfile,
  };
}

/**
 * Hook for filtering and transforming content in one step
 */
export function useFilteredContent<T extends ContentItem, R = T>(
  content: T[],
  transform?: (item: T) => R
): R[] {
  const { activeProfile } = useProfile();

  return useMemo(() => {
    const filtered = filterContentForProfile(content, activeProfile);
    if (transform) {
      return filtered.map(transform);
    }
    return filtered as unknown as R[];
  }, [content, activeProfile, transform]);
}

/**
 * Hook for getting filtering callbacks
 * Returns stable callback references for use in effects and event handlers
 */
export function useFilteringCallbacks() {
  const { activeProfile } = useProfile();

  const filterContent = useCallback(
    <T extends ContentItem>(content: T[]): T[] => {
      return filterContentForProfile(content, activeProfile);
    },
    [activeProfile]
  );

  const checkContentAllowed = useCallback(
    <T extends ContentItem>(content: T): boolean => {
      return isContentAllowed(content, activeProfile);
    },
    [activeProfile]
  );

  const checkContentWarning = useCallback(
    <T extends ContentItem>(content: T): boolean => {
      return shouldShowContentWarning(content, activeProfile);
    },
    [activeProfile]
  );

  const getNormalizedRating = useCallback((rating: string | undefined | null) => {
    return normalizeRating(rating);
  }, []);

  return {
    filterContent,
    checkContentAllowed,
    checkContentWarning,
    getNormalizedRating,
  };
}

/**
 * Hook for paginated content filtering
 * Filters content and provides pagination helpers
 */
export function usePaginatedFilteredContent<T extends ContentItem>(
  content: T[],
  pageSize: number = 20
) {
  const { activeProfile } = useProfile();

  return useMemo(() => {
    const filtered = filterContentForProfile(content, activeProfile);
    const totalPages = Math.ceil(filtered.length / pageSize);

    const getPage = (page: number): T[] => {
      const start = page * pageSize;
      const end = start + pageSize;
      return filtered.slice(start, end);
    };

    return {
      allItems: filtered,
      totalCount: filtered.length,
      totalPages,
      pageSize,
      getPage,
      isFiltered: filtered.length < content.length,
      blockedCount: content.length - filtered.length,
    };
  }, [content, activeProfile, pageSize]);
}

export default useProfileFiltering;
