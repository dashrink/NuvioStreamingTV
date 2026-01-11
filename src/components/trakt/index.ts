/**
 * Trakt Components Module
 *
 * This module exports all Trakt-related UI components for easy importing
 * throughout the application.
 *
 * ## Components
 *
 * ### TraktRatingComponent
 * Inline rating display with tap-to-rate functionality.
 * Shows 5 stars with half-star precision (maps to 1-10 Trakt scale).
 * Best for: Media detail screens, content cards.
 *
 * ### TraktRatingModal
 * Full-screen modal for rating content with 1-10 button selector.
 * Shows rating descriptions ("Totally Ninja!" for 10).
 * Best for: Action sheet style rating selection.
 *
 * ## Usage
 *
 * ```tsx
 * import { TraktRatingComponent, TraktRatingModal } from '../components/trakt';
 *
 * // Inline rating display
 * <TraktRatingComponent imdbId="tt1234567" type="movie" />
 *
 * // Modal rating
 * <TraktRatingModal
 *   visible={showModal}
 *   onClose={() => setShowModal(false)}
 *   imdbId="tt1234567"
 *   type="movie"
 *   contentTitle="Movie Title"
 * />
 * ```
 *
 * ## Important Notes
 *
 * - Both components require useTraktContext (must be within TraktProvider)
 * - Content type must be 'movie' or 'show' (NOT 'series')
 * - IMDb IDs are auto-normalized (with or without 'tt' prefix)
 * - Components handle loading and error states internally
 * - Optimistic UI updates for better perceived performance
 *
 * @module TraktComponents
 */
export { default as TraktRatingComponent } from './TraktRatingComponent';
export { default as TraktRatingModal } from './TraktRatingModal';
