/**
 * TraktContext - React Context for Trakt.tv integration throughout the app
 *
 * This context provides a centralized way to access Trakt functionality from
 * any component in the app. It wraps the useTraktIntegration hook and exposes
 * its state and methods via React Context.
 *
 * ## Architecture
 *
 * ```
 * TraktProvider (wraps app)
 *       │
 *       ├── useTraktIntegration() hook
 *       │         │
 *       │         └── traktService singleton
 *       │                    │
 *       │                    └── Trakt.tv API
 *       │
 *       └── TraktContext.Provider
 *                 │
 *                 └── Child components use useTraktContext()
 * ```
 *
 * ## Usage
 *
 * 1. Wrap your app with TraktProvider:
 * ```tsx
 * <TraktProvider>
 *   <App />
 * </TraktProvider>
 * ```
 *
 * 2. Access Trakt functionality in any child component:
 * ```tsx
 * const { isInWatchlist, addToWatchlist, getUserRating } = useTraktContext();
 * ```
 *
 * ## Key Features Exposed
 *
 * - **Authentication**: isAuthenticated, userProfile
 * - **Watchlist**: isInWatchlist(), addToWatchlist(), removeFromWatchlist()
 * - **Collection**: isInCollection(), addToCollection(), removeFromCollection()
 * - **Ratings**: getUserRating(), addRating(), removeRating()
 * - **Watch Progress**: continueWatching, loadAllCollections()
 *
 * ## Important Notes
 *
 * - Content type must be 'movie' or 'show' (NOT 'series')
 * - IMDb IDs are auto-normalized (with or without 'tt' prefix)
 * - Status checks (isInWatchlist, getUserRating) use cached data (no API calls)
 * - Mutations (addToWatchlist, addRating) make API calls with rate limiting
 *
 * @see useTraktIntegration for detailed method documentation
 * @module TraktContext
 */
import React, { createContext, useContext, ReactNode } from 'react';
import { useTraktIntegration } from '../hooks/useTraktIntegration';
import {
  TraktUser,
  TraktWatchedItem,
  TraktWatchlistItem,
  TraktCollectionItem,
  TraktRatingItem,
  TraktPlaybackItem
} from '../services/traktService';

/**
 * Props interface for the Trakt context
 *
 * All methods and state from useTraktIntegration are exposed through this interface.
 * See the individual method documentation in useTraktIntegration for details.
 */
interface TraktContextProps {
  isAuthenticated: boolean;
  isLoading: boolean;
  userProfile: TraktUser | null;
  watchedMovies: TraktWatchedItem[];
  watchedShows: TraktWatchedItem[];
  watchlistMovies: TraktWatchlistItem[];
  watchlistShows: TraktWatchlistItem[];
  collectionMovies: TraktCollectionItem[];
  collectionShows: TraktCollectionItem[];
  continueWatching: TraktPlaybackItem[];
  ratedContent: TraktRatingItem[];
  checkAuthStatus: () => Promise<void>;
  refreshAuthStatus: () => Promise<void>;
  loadWatchedItems: () => Promise<void>;
  loadAllCollections: () => Promise<void>;
  isMovieWatched: (imdbId: string) => Promise<boolean>;
  isEpisodeWatched: (imdbId: string, season: number, episode: number) => Promise<boolean>;
  markMovieAsWatched: (imdbId: string, watchedAt?: Date) => Promise<boolean>;
  markEpisodeAsWatched: (imdbId: string, season: number, episode: number, watchedAt?: Date) => Promise<boolean>;
  forceSyncTraktProgress?: () => Promise<boolean>;
  // Trakt content management
  addToWatchlist: (imdbId: string, type: 'movie' | 'show') => Promise<boolean>;
  removeFromWatchlist: (imdbId: string, type: 'movie' | 'show') => Promise<boolean>;
  addToCollection: (imdbId: string, type: 'movie' | 'show') => Promise<boolean>;
  removeFromCollection: (imdbId: string, type: 'movie' | 'show') => Promise<boolean>;
  isInWatchlist: (imdbId: string, type: 'movie' | 'show') => boolean;
  isInCollection: (imdbId: string, type: 'movie' | 'show') => boolean;
  // Trakt rating management
  addRating: (imdbId: string, type: 'movie' | 'show', rating: number) => Promise<boolean>;
  removeRating: (imdbId: string, type: 'movie' | 'show') => Promise<boolean>;
  getUserRating: (imdbId: string, type: 'movie' | 'show') => number | null;
}

const TraktContext = createContext<TraktContextProps | undefined>(undefined);

/**
 * TraktProvider - Provider component that initializes Trakt integration
 *
 * Wraps the application (or a subtree) to provide Trakt functionality to all
 * child components. Should be placed high in the component tree, typically
 * at the app root level.
 *
 * @param children - Child components that will have access to Trakt context
 *
 * @example
 * ```tsx
 * // In App.tsx or _layout.tsx
 * export default function App() {
 *   return (
 *     <TraktProvider>
 *       <NavigationContainer>
 *         <AppNavigator />
 *       </NavigationContainer>
 *     </TraktProvider>
 *   );
 * }
 * ```
 */
export function TraktProvider({ children }: { children: ReactNode }) {
  const traktIntegration = useTraktIntegration();

  return (
    <TraktContext.Provider value={traktIntegration}>
      {children}
    </TraktContext.Provider>
  );
}

/**
 * useTraktContext - Hook to access Trakt functionality from any component
 *
 * Must be used within a TraktProvider. Throws an error if used outside.
 *
 * @returns TraktContextProps - All Trakt state and methods
 * @throws Error if used outside of TraktProvider
 *
 * @example
 * ```tsx
 * function MovieCard({ imdbId, title }: { imdbId: string; title: string }) {
 *   const { isInWatchlist, addToWatchlist, removeFromWatchlist, getUserRating } = useTraktContext();
 *
 *   const inWatchlist = isInWatchlist(imdbId, 'movie');
 *   const rating = getUserRating(imdbId, 'movie');
 *
 *   const handleWatchlistToggle = async () => {
 *     if (inWatchlist) {
 *       await removeFromWatchlist(imdbId, 'movie');
 *     } else {
 *       await addToWatchlist(imdbId, 'movie');
 *     }
 *   };
 *
 *   return (
 *     <View>
 *       <Text>{title}</Text>
 *       {rating && <Text>Your rating: {rating}/10</Text>}
 *       <Button title={inWatchlist ? 'Remove' : 'Add'} onPress={handleWatchlistToggle} />
 *     </View>
 *   );
 * }
 * ```
 */
export function useTraktContext() {
  const context = useContext(TraktContext);
  if (context === undefined) {
    throw new Error('useTraktContext must be used within a TraktProvider');
  }
  return context;
} 