/**
 * TVVoiceSearch.tsx
 *
 * Non-TV fallback for the TV voice search component.
 * On non-TV platforms, this component renders nothing as voice search
 * is typically handled differently (keyboard input, system voice assistant, etc.).
 *
 * For mobile platforms, consider using the SearchScreen component instead,
 * or integrating with platform-specific voice APIs:
 * - iOS: SiriKit, Speech framework
 * - Android: SpeechRecognizer
 *
 * @example
 * ```tsx
 * import TVVoiceSearch from '@/components/tv/TVVoiceSearch';
 *
 * function App() {
 *   return (
 *     <>
 *       {/* Your app content *\/}
 *       <TVVoiceSearch onSearch={(query) => navigateToSearch(query)} />
 *     </>
 *   );
 * }
 * ```
 */

import React from 'react';

// =============================================================================
// Types
// =============================================================================

/**
 * Search result item (re-exported for API consistency)
 */
export interface VoiceSearchResult {
  /** Unique identifier */
  id: string;
  /** Display title */
  title: string;
  /** Optional subtitle (e.g., year, type) */
  subtitle?: string;
  /** Optional poster/thumbnail URL */
  posterUrl?: string;
  /** Result type (movie, series, etc.) */
  type?: 'movie' | 'series' | 'episode' | 'person' | 'other';
}

/**
 * Props for the TVVoiceSearch component
 */
export interface TVVoiceSearchProps {
  /** Callback when search is submitted */
  onSearch?: (query: string) => void;
  /** Callback when a search result is selected */
  onResultSelect?: (result: VoiceSearchResult) => void;
  /** Optional search results to display */
  searchResults?: VoiceSearchResult[];
  /** Whether search is loading */
  isSearching?: boolean;
  /** Placeholder text for text input */
  placeholder?: string;
  /** Test ID for testing purposes */
  testID?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Non-TV fallback - renders nothing
 *
 * On non-TV platforms, voice search should be implemented using
 * platform-appropriate patterns:
 * - iOS: SiriKit integration or Speech framework
 * - Android: SpeechRecognizer integration
 * - Web: Web Speech API
 *
 * The search functionality itself should be available through
 * the standard SearchScreen component on mobile/web platforms.
 */
const TVVoiceSearch: React.FC<TVVoiceSearchProps> = () => {
  // Non-TV platforms don't use this component
  return null;
};

// =============================================================================
// Exports
// =============================================================================

export default TVVoiceSearch;

export type { TVVoiceSearchProps, VoiceSearchResult };
