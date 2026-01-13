# React Native App - Component & Screen Inventory

This document provides a comprehensive inventory of all React components and screens in the Nuvio Streaming TV application, including their responsibilities, platform variants, and key features.

## Table of Contents

- [Root Components](#root-components)
- [Common Components](#common-components)
- [Feature Components](#feature-components)
  - [Calendar](#calendar)
  - [Debug](#debug)
  - [Home](#home)
  - [Icons](#icons)
  - [Loading](#loading)
  - [Metadata](#metadata)
  - [Player](#player)
  - [Profile](#profile)
  - [Promotions](#promotions)
  - [Search](#search)
  - [Trakt](#trakt)
  - [TV](#tv)
  - [UI](#ui)
  - [Video](#video)
- [Screens](#screens)
  - [Main Screens](#main-screens)
  - [Settings Screens](#settings-screens)
  - [Stream Screens](#stream-screens)

---

## Root Components

### AndroidUpdatePopup.tsx
**Responsibility:** Displays Android-specific update notifications and prompts users to update the app.
**Platform:** Android-specific
**Key Features:**
- Update version checking
- User dismissal handling
- Platform-specific UI

### AnimatedImage.tsx
**Responsibility:** Wrapper component for images with animation capabilities.
**Platform:** Cross-platform
**Key Features:**
- Fade-in animations
- Loading states
- Optimized image rendering

### AnimatedText.tsx
**Responsibility:** Text component with built-in animation support.
**Platform:** Cross-platform
**Key Features:**
- Text fade/slide animations
- Reanimated integration
- Performance optimizations

### AnimatedView.tsx
**Responsibility:** Generic animated view wrapper for layout animations.
**Platform:** Cross-platform
**Key Features:**
- Layout transitions
- Reanimated support
- Flexible animation configs

### AnnouncementOverlay.tsx
**Responsibility:** Full-screen overlay for displaying important announcements.
**Platform:** Cross-platform
**Key Features:**
- Modal presentation
- Dismissible overlay
- Rich content support

### BackupRestoreSettings.tsx
**Responsibility:** UI component for managing app data backup and restore.
**Platform:** Cross-platform
**Key Features:**
- Backup creation
- Restore functionality
- Data migration handling

### CustomAlert.tsx
**Responsibility:** Custom alert/dialog component replacing native alerts.
**Platform:** Cross-platform
**Key Features:**
- Themed styling
- Custom buttons
- Animation support

### FirstTimeWelcome.tsx
**Responsibility:** Welcome screen shown to first-time users.
**Platform:** Cross-platform
**Key Features:**
- Onboarding flow
- App feature highlights
- Navigation to setup

### MajorUpdateOverlay.tsx
**Responsibility:** Displays information about major app updates.
**Platform:** Cross-platform
**Key Features:**
- Version comparison
- Feature highlights
- Update notes

### NuvioHeader.tsx
**Responsibility:** Main app header/navigation bar component.
**Platform:** Cross-platform
**Key Features:**
- Navigation controls
- Profile switcher
- Search integration

### ProfileIcon.tsx
**Responsibility:** Avatar display for user profiles.
**Platform:** Cross-platform
**Key Features:**
- Custom avatars
- Kids mode indicators
- Profile selection

### ProviderFilter.tsx / ProviderFilter.tv.tsx
**Responsibility:** Filter component for streaming providers.
**Platform:** Cross-platform with TV variant
**Key Features:**
- Provider selection
- Multi-select support
- TV-optimized navigation (TV variant)

### PulsingChip.tsx
**Responsibility:** Animated chip/badge with pulsing effect.
**Platform:** Cross-platform
**Key Features:**
- Attention-grabbing animation
- Status indicators
- Customizable styling

### SplashScreen.tsx
**Responsibility:** Initial loading screen shown on app startup.
**Platform:** Cross-platform
**Key Features:**
- Branding display
- Loading indicators
- Smooth transitions

### StreamCard.tsx / StreamCard.tv.tsx
**Responsibility:** Card component displaying available streams.
**Platform:** Cross-platform with TV variant
**Key Features:**
- Stream quality display
- Provider information
- TV focus handling (TV variant)

### TabletStreamsLayout.tsx
**Responsibility:** Specialized layout for streams on tablet devices.
**Platform:** Tablet-optimized
**Key Features:**
- Responsive grid layout
- Multi-column support
- Touch optimization

### UpdatePopup.tsx
**Responsibility:** Generic update notification popup.
**Platform:** Cross-platform
**Key Features:**
- Version checking
- Update prompts
- Skip/remind options

---

## Common Components

### AgeRatingBadge.tsx
**Responsibility:** Displays content age rating (PG, R, etc.).
**Platform:** Cross-platform
**Key Features:**
- Rating display
- Color-coded badges
- Localized ratings

### CustomSwitch.tsx
**Responsibility:** Themed toggle switch component.
**Platform:** Cross-platform
**Key Features:**
- Custom styling
- Smooth animations
- Accessibility support

### EmptyState.tsx
**Responsibility:** Placeholder UI for empty content states.
**Platform:** Cross-platform
**Key Features:**
- Icon display
- Custom messages
- Action buttons

### Focusable.tsx / Focusable.tv.tsx / Focusable.shared.ts
**Responsibility:** Universal wrapper for TV remote focus handling.
**Platform:** Cross-platform with TV-specific implementation
**Key Features:**
- D-pad navigation
- Focus animations (scale, border, glow)
- Multiple variants (card, button, listItem, hero)
- Parallax effects (tvOS)
- Android TV native ID support
**Variants:**
- `card`: Default for content cards with scale effect
- `button`: Action buttons with subtle animation
- `listItem`: Settings/list items with minimal animation
- `hero`: Large hero sections with minimal scale

### FocusableList.tsx
**Responsibility:** List container with TV focus management.
**Platform:** TV-optimized
**Key Features:**
- Focus navigation
- Spatial navigation
- Scroll handling

### LoadingSpinner.tsx
**Responsibility:** Standard loading spinner component.
**Platform:** Cross-platform
**Key Features:**
- Customizable size
- Theme integration
- Smooth animations

### OptimizedImage.tsx
**Responsibility:** Performance-optimized image component.
**Platform:** Cross-platform
**Key Features:**
- Fast image caching
- Progressive loading
- Memory management

### Poster.tsx
**Responsibility:** Movie/TV show poster display component.
**Platform:** Cross-platform
**Key Features:**
- Aspect ratio handling
- Placeholder states
- Cache optimization

### ScreenHeader.tsx
**Responsibility:** Reusable header component for screens.
**Platform:** Cross-platform
**Key Features:**
- Title display
- Navigation actions
- Consistent styling

### TraktLoadingSpinner.tsx
**Responsibility:** Trakt-branded loading indicator.
**Platform:** Cross-platform
**Key Features:**
- Trakt logo animation
- Custom branding
- Integration states

### TVModalWrapper.tsx
**Responsibility:** Modal container optimized for TV navigation.
**Platform:** TV-specific
**Key Features:**
- Focus trap
- Back button handling
- TV-safe areas

### TVTextInput.tsx / TVTextInput.tv.tsx
**Responsibility:** Text input component optimized for TV remotes.
**Platform:** Cross-platform with TV variant
**Key Features:**
- Virtual keyboard
- D-pad navigation
- Predictive text (TV variant)

---

## Feature Components

### Calendar

#### CalendarSection.tsx
**Responsibility:** Displays upcoming releases calendar.
**Platform:** Cross-platform
**Key Features:**
- Date-based content listing
- Release tracking
- Navigation integration

---

### Debug

#### FocusDebugOverlay.tsx
**Responsibility:** Development overlay showing focus state information.
**Platform:** TV development
**Key Features:**
- Real-time focus tracking
- Visual focus indicators
- Debug information display

#### index.ts
**Responsibility:** Debug component exports.

---

### Home

#### AppleTVHero.tsx / AppleTVHero.tv.tsx
**Responsibility:** Apple TV-style hero banner for featured content.
**Platform:** Cross-platform with TV variant
**Key Features:**
- Parallax scrolling
- Auto-play trailers
- Featured content rotation

#### CatalogSection.tsx / CatalogSection.tv.tsx
**Responsibility:** Horizontal scrolling catalog of content.
**Platform:** Cross-platform with TV variant
**Key Features:**
- Responsive poster sizing
- Dynamic layout calculation
- View all navigation
- TV focus optimization (TV variant)

#### ContentItem.tsx / ContentItem.tv.tsx
**Responsibility:** Individual content card in catalog.
**Platform:** Cross-platform with TV variant
**Key Features:**
- Poster display
- Rating badges
- Watch indicators
- TV focus effects (TV variant)

#### ContinueWatchingSection.tsx
**Responsibility:** Row showing partially watched content.
**Platform:** Cross-platform
**Key Features:**
- Progress indicators
- Resume playback
- Watch history integration

#### DropUpMenu.tsx
**Responsibility:** Context menu appearing from bottom.
**Platform:** Mobile-optimized
**Key Features:**
- Content actions
- Library management
- Share functionality

#### FeaturedContent.tsx
**Responsibility:** Featured content display in hero section.
**Platform:** Cross-platform
**Key Features:**
- Banner images
- Action buttons
- Metadata display

#### HeroCarousel.tsx / HeroCarousel.tv.tsx
**Responsibility:** Auto-rotating carousel for featured content.
**Platform:** Cross-platform with TV variant
**Key Features:**
- Auto-play
- Manual navigation
- Indicator dots
- TV remote control (TV variant)

#### SkeletonLoaders.tsx
**Responsibility:** Loading placeholders for home screen.
**Platform:** Cross-platform
**Key Features:**
- Shimmer animations
- Content shape matching
- Smooth transitions

#### ThisWeekSection.tsx
**Responsibility:** Shows new releases for the current week.
**Platform:** Cross-platform
**Key Features:**
- Weekly content filtering
- Release date sorting
- Quick access navigation

---

### Icons

#### MDBListIcon.tsx
**Responsibility:** Icon for MDBList integration.
**Platform:** Cross-platform

#### PluginIcon.tsx
**Responsibility:** Generic plugin/addon icon.
**Platform:** Cross-platform

#### ProfileIcon.tsx
**Responsibility:** User profile avatar icon.
**Platform:** Cross-platform

#### TMDBIcon.tsx
**Responsibility:** TMDB (The Movie Database) branding icon.
**Platform:** Cross-platform

#### TraktIcon.tsx
**Responsibility:** Trakt service branding icon.
**Platform:** Cross-platform

---

### Loading

#### ContentSkeleton.tsx
**Responsibility:** Skeleton loader for content cards.
**Platform:** Cross-platform
**Key Features:**
- Poster shape skeleton
- Shimmer effect
- Responsive sizing

#### LoadingOverlayScreen.tsx
**Responsibility:** Full-screen loading overlay.
**Platform:** Cross-platform
**Key Features:**
- Blocking UI
- Message display
- Progress indication

#### MetadataLoadingScreen.tsx
**Responsibility:** Loading state for metadata screens.
**Platform:** Cross-platform
**Key Features:**
- Hero section skeleton
- Content layout skeleton
- Smooth appearance

#### ShimmerSkeleton.tsx
**Responsibility:** Base shimmer effect component.
**Platform:** Cross-platform
**Key Features:**
- Animated gradient
- Customizable dimensions
- Performance optimized

#### SkeletonGroup.tsx
**Responsibility:** Container for multiple skeleton loaders.
**Platform:** Cross-platform
**Key Features:**
- Coordinated animations
- Layout management
- Batch rendering

#### UnifiedSpinner.tsx
**Responsibility:** Unified loading spinner across app.
**Platform:** Cross-platform
**Key Features:**
- Consistent branding
- Size variants
- Theme integration

#### index.ts / types.ts
**Responsibility:** Loading component exports and type definitions.

---

### Metadata

#### AgeBadge.tsx
**Responsibility:** Content age rating badge.
**Platform:** Cross-platform
**Key Features:**
- Rating display
- Color coding
- Certification info

#### CastDetailsModal.tsx
**Responsibility:** Modal showing detailed cast member information.
**Platform:** Cross-platform
**Key Features:**
- Actor biography
- Filmography
- Role information

#### CastSection.tsx / CastSection.tv.tsx
**Responsibility:** Cast and crew listing.
**Platform:** Cross-platform with TV variant
**Key Features:**
- Actor photos
- Character names
- Horizontal scrolling
- TV navigation (TV variant)

#### CollectionSection.tsx
**Responsibility:** Displays movie collections (e.g., Marvel Cinematic Universe).
**Platform:** Cross-platform
**Key Features:**
- Collection browsing
- Related content
- Sequential ordering

#### CommentsSection.tsx
**Responsibility:** User comments and reviews section.
**Platform:** Cross-platform
**Key Features:**
- Comment display
- Trakt integration
- Spoiler handling

#### FloatingHeader.tsx
**Responsibility:** Floating header that appears on scroll.
**Platform:** Cross-platform
**Key Features:**
- Scroll-triggered appearance
- Title/metadata display
- Back navigation

#### HeroSection.tsx / HeroSection.tv.tsx
**Responsibility:** Main hero banner on metadata screen.
**Platform:** Cross-platform with TV variant
**Key Features:**
- Backdrop parallax
- Trailer auto-play
- Action buttons
- Watch progress
- Glass blur effects
**Sub-components:**
- ActionButtons.tsx
- GlassBlurBackground.tsx
- HeroBackButton.tsx
- HeroBackdrop.tsx
- HeroGenres.tsx
- HeroGradientOverlay.tsx
- HeroTitleCard.tsx
- HeroTrailerLayer.tsx
- TrailerControls.tsx
- WatchProgressDisplay.tsx
**Hooks:**
- useBackdropParallax.ts
- useHeroAnimations.ts
- useStableLogo.ts
- useTrailerPlayback.ts

#### MetadataDetails.tsx
**Responsibility:** Detailed information section (plot, runtime, etc.).
**Platform:** Cross-platform
**Key Features:**
- Synopsis display
- Technical details
- Genre tags

#### MoreLikeThisSection.tsx
**Responsibility:** Recommendations for similar content.
**Platform:** Cross-platform
**Key Features:**
- TMDB recommendations
- Content suggestions
- Quick navigation

#### MovieContent.tsx
**Responsibility:** Movie-specific metadata layout.
**Platform:** Cross-platform
**Key Features:**
- Movie details
- Watch buttons
- Collection info

#### QualityBadge.tsx
**Responsibility:** Stream quality indicator (4K, HD, etc.).
**Platform:** Cross-platform
**Key Features:**
- Quality display
- Color coding
- HDR indicators

#### RatingsSection.tsx
**Responsibility:** Displays ratings from multiple sources.
**Platform:** Cross-platform
**Key Features:**
- IMDb ratings
- Rotten Tomatoes
- Trakt ratings

#### SeriesContent.tsx / SeriesContent.tv.tsx
**Responsibility:** TV series-specific metadata layout.
**Platform:** Cross-platform with TV variant
**Key Features:**
- Season/episode navigation
- Episode lists
- Next episode tracking
- TV-optimized scrolling (TV variant)

#### TrailerModal.tsx
**Responsibility:** Modal for playing content trailers.
**Platform:** Cross-platform
**Key Features:**
- Video playback
- Controls
- Fullscreen support

#### TrailersSection.tsx
**Responsibility:** Section displaying available trailers.
**Platform:** Cross-platform
**Key Features:**
- Trailer thumbnails
- Play functionality
- Multiple trailer support

---

### Player

#### AndroidVideoPlayer.tsx / AndroidVideoPlayer.tv.tsx
**Responsibility:** Android-specific video player implementation.
**Platform:** Android with TV variant
**Key Features:**
- MPV player integration
- Hardware acceleration
- Subtitle support

#### KSPlayer.tsx / KSPlayerComponent.tsx / KSPlayerCore.tsx
**Responsibility:** iOS video player (KSPlayer) implementation.
**Platform:** iOS
**Key Features:**
- AVPlayer integration
- PiP support
- Airplay support

#### Cards

##### EpisodeCard.tsx
**Responsibility:** Episode information card in player.
**Platform:** Cross-platform
**Key Features:**
- Episode metadata
- Next episode preview
- Quick navigation

#### Common

##### UpNextButton.tsx
**Responsibility:** "Up Next" countdown and skip button.
**Platform:** Cross-platform
**Key Features:**
- Auto-play countdown
- Skip functionality
- Episode preview

#### Components

##### GestureControls.tsx
**Responsibility:** Touch/gesture controls for player.
**Platform:** Cross-platform
**Key Features:**
- Double-tap seek
- Pinch to zoom
- Swipe for brightness/volume

##### PauseOverlay.tsx
**Responsibility:** Overlay shown when playback is paused.
**Platform:** Cross-platform
**Key Features:**
- Metadata display
- Resume button
- Background dim

##### SpeedActivatedOverlay.tsx
**Responsibility:** Visual feedback when playback speed changes.
**Platform:** Cross-platform
**Key Features:**
- Speed indicator
- Auto-dismiss
- Animation

##### index.ts
**Responsibility:** Player component exports.

#### Controls

##### PlayerControls.tsx / PlayerControls.tv.tsx
**Responsibility:** Playback control UI.
**Platform:** Cross-platform with TV variant
**Key Features:**
- Play/pause
- Seek bar
- Settings access
- TV remote integration (TV variant)

#### Modals

##### AudioTrackModal.tsx
**Responsibility:** Audio track selection modal.
**Platform:** Cross-platform
**Key Features:**
- Language selection
- Audio codec info
- Track switching

##### EpisodesModal.tsx
**Responsibility:** Episode list modal during playback.
**Platform:** Cross-platform
**Key Features:**
- Season selection
- Episode browsing
- Quick switching

##### EpisodeStreamsModal.tsx
**Responsibility:** Stream selection for episodes.
**Platform:** Cross-platform
**Key Features:**
- Quality options
- Provider selection
- Stream info

##### ErrorModal.tsx
**Responsibility:** Playback error display.
**Platform:** Cross-platform
**Key Features:**
- Error messages
- Retry options
- Troubleshooting

##### LoadingOverlay.tsx
**Responsibility:** Loading state during playback initialization.
**Platform:** Cross-platform
**Key Features:**
- Buffering indicator
- Metadata display
- Progress feedback

##### ResumeOverlay.tsx
**Responsibility:** Resume playback from last position prompt.
**Platform:** Cross-platform
**Key Features:**
- Resume/restart options
- Timestamp display
- Auto-dismiss

##### SourcesModal.tsx
**Responsibility:** Source/addon selection modal.
**Platform:** Cross-platform
**Key Features:**
- Source browsing
- Quality filtering
- Provider info

##### SpeedModal.tsx
**Responsibility:** Playback speed adjustment modal.
**Platform:** Cross-platform
**Key Features:**
- Speed presets
- Custom speed
- Reset option

##### SubtitleModals.tsx
**Responsibility:** Subtitle selection and configuration.
**Platform:** Cross-platform
**Key Features:**
- Language selection
- Style customization
- Subtitle search

##### SubtitleSyncModal.tsx
**Responsibility:** Subtitle timing adjustment.
**Platform:** Cross-platform
**Key Features:**
- Offset controls
- Preview
- Fine-tuning

#### Overlays

##### ParentalGuideOverlay.tsx
**Responsibility:** Parental rating warning before playback.
**Platform:** Cross-platform
**Key Features:**
- Age warnings
- PIN verification
- Content info

##### SkipIntroButton.tsx
**Responsibility:** Button to skip opening credits.
**Platform:** Cross-platform
**Key Features:**
- Auto-detection timing
- Quick seek
- Dismissible

#### Subtitles

##### CustomSubtitles.tsx
**Responsibility:** Custom subtitle renderer.
**Platform:** Cross-platform
**Key Features:**
- Style customization
- Positioning
- Format support

#### Android/iOS Specific Hooks and Components
**Location:** `player/android/`, `player/ios/`
**Responsibility:** Platform-specific player implementations.
**Key Files:**
- useNextEpisode.ts
- useOpeningAnimation.ts
- usePlayerControls.ts
- usePlayerModals.ts
- usePlayerSetup.ts
- usePlayerState.ts
- usePlayerTracks.ts
- useSpeedControl.ts
- useWatchProgress.ts (shared)
- useCustomSubtitles.ts (shared)

#### Utils

##### playerStyles.ts
**Responsibility:** Shared player styles.

##### playerTypes.ts
**Responsibility:** Player type definitions.

##### playerUtils.ts
**Responsibility:** Player utility functions.

##### subtitleParser.ts
**Responsibility:** Subtitle format parsing.

##### trackSelectionUtils.ts
**Responsibility:** Audio/subtitle track utilities.

---

### Profile

#### AvatarSelector.tsx
**Responsibility:** Avatar selection interface for profiles.
**Platform:** Cross-platform
**Key Features:**
- Avatar grid
- Custom uploads
- Preset options

#### KidsModeWrapper.tsx
**Responsibility:** Wrapper component enforcing kids mode restrictions.
**Platform:** Cross-platform
**Key Features:**
- Content filtering
- UI restrictions
- Age-appropriate design

#### PinEntryModal.tsx
**Responsibility:** PIN entry for profile switching.
**Platform:** Cross-platform
**Key Features:**
- Numeric keypad
- Masked input
- Verification

#### PinSetupModal.tsx
**Responsibility:** PIN creation/modification modal.
**Platform:** Cross-platform
**Key Features:**
- PIN creation
- Confirmation
- Requirements display

#### ProfileCard.tsx
**Responsibility:** Profile selection card.
**Platform:** Cross-platform
**Key Features:**
- Avatar display
- Profile name
- Kids indicator

#### ProfileEditModal.tsx
**Responsibility:** Profile editing interface.
**Platform:** Cross-platform
**Key Features:**
- Name editing
- Avatar change
- Settings access

#### ProfileSwitcherBottomSheet.tsx
**Responsibility:** Bottom sheet for quick profile switching.
**Platform:** Mobile-optimized
**Key Features:**
- Profile list
- Quick switch
- Gesture dismiss

#### index.ts
**Responsibility:** Profile component exports.

---

### Promotions

#### CampaignManager.tsx
**Responsibility:** Manages promotional campaigns and announcements.
**Platform:** Cross-platform
**Key Features:**
- Campaign scheduling
- Display rules
- User interactions

#### PosterModal.tsx
**Responsibility:** Full-screen promotional poster display.
**Platform:** Cross-platform
**Key Features:**
- Image display
- Action buttons
- Dismissible

---

### Search

#### RecentSearches.tsx
**Responsibility:** Displays recent search history.
**Platform:** Cross-platform
**Key Features:**
- History management
- Quick re-search
- Clear history

#### SearchAnimation.tsx
**Responsibility:** Loading animation during search.
**Platform:** Cross-platform
**Key Features:**
- Animated search icon
- Loading states
- Smooth transitions

#### SearchResultItem.tsx
**Responsibility:** Individual search result card.
**Platform:** Cross-platform
**Key Features:**
- Result preview
- Quick actions
- Type indicators

#### SearchSkeletonLoader.tsx
**Responsibility:** Loading placeholder for search results.
**Platform:** Cross-platform
**Key Features:**
- Result skeletons
- Grid layout
- Shimmer effect

#### searchUtils.ts
**Responsibility:** Search utility functions.

#### index.ts
**Responsibility:** Search component exports.

---

### Trakt

#### TraktRatingComponent.tsx
**Responsibility:** Trakt rating display widget.
**Platform:** Cross-platform
**Key Features:**
- Star ratings
- User ratings
- Quick rate

#### TraktRatingModal.tsx
**Responsibility:** Modal for submitting Trakt ratings.
**Platform:** Cross-platform
**Key Features:**
- Star selection
- Comments
- Spoiler toggle

#### index.ts
**Responsibility:** Trakt component exports.

---

### TV

#### TVBackHandler.tsx / TVBackHandler.tv.tsx
**Responsibility:** TV back button navigation handler.
**Platform:** TV-specific
**Key Features:**
- Back button events
- Navigation stack
- Custom back actions

#### TVContextMenu.tsx / TVContextMenu.tv.tsx
**Responsibility:** Context menu optimized for TV navigation.
**Platform:** TV-specific
**Key Features:**
- D-pad navigation
- Menu options
- Focus management

#### TVContinueWatchingSection.tsx
**Responsibility:** Continue watching section optimized for TV.
**Platform:** TV-specific
**Key Features:**
- Large thumbnails
- Progress indicators
- TV focus

#### TVFocusGuard.tsx / TVFocusGuard.tv.tsx
**Responsibility:** Prevents focus from escaping designated areas.
**Platform:** TV-specific
**Key Features:**
- Focus boundaries
- Trap focus
- Navigation control

#### TVLibraryFolders.tsx
**Responsibility:** TV-optimized library folder navigation.
**Platform:** TV-specific
**Key Features:**
- Folder hierarchy
- Grid layout
- Remote navigation

#### TVLibraryGrid.tsx
**Responsibility:** Grid layout for library content on TV.
**Platform:** TV-specific
**Key Features:**
- Responsive grid
- Focus optimization
- Performance tuning

#### TVNavigationBackHandlerProvider.tsx / TVNavigationBackHandlerProvider.tv.tsx
**Responsibility:** Context provider for TV navigation.
**Platform:** TV-specific
**Key Features:**
- Back button context
- Navigation state
- Handler registration

#### TVScreenWrapper.tsx / TVScreenWrapper.tv.tsx
**Responsibility:** Common wrapper for TV screens.
**Platform:** TV-specific
**Key Features:**
- Safe areas
- Focus management
- Back handling

#### TVVoiceSearch.tsx / TVVoiceSearch.tv.tsx
**Responsibility:** Voice search integration for TV platforms.
**Platform:** TV-specific
**Key Features:**
- Voice input
- Speech recognition
- Search execution

#### index.ts
**Responsibility:** TV component exports.

---

### UI

#### Toast.tsx
**Responsibility:** Toast notification component.
**Platform:** Cross-platform
**Key Features:**
- Auto-dismiss
- Action buttons
- Queue management

#### ToastManager.tsx
**Responsibility:** Manages toast notification lifecycle.
**Platform:** Cross-platform
**Key Features:**
- Queue system
- Display timing
- Multiple toasts

---

### Video

#### TrailerPlayer.tsx
**Responsibility:** Embedded trailer video player.
**Platform:** Cross-platform
**Key Features:**
- Inline playback
- Controls
- Auto-play support

---

### Patterns

#### AbstractResponsiveComponent.ts
**Responsibility:** Base class for responsive components.
**Platform:** Cross-platform
**Key Features:**
- Breakpoint handling
- Device detection
- Adaptive layouts

---

## Screens

### Main Screens

#### AccountManageScreen.tsx
**Responsibility:** User account management interface.
**Platform:** Cross-platform
**Key Features:**
- Profile management
- Settings
- Subscription info

#### AddonsScreen.tsx
**Responsibility:** Browse and manage Stremio addons.
**Platform:** Cross-platform
**Key Features:**
- Addon catalog
- Installation
- Configuration

#### AIChatScreen.tsx
**Responsibility:** AI-powered chat interface.
**Platform:** Cross-platform
**Key Features:**
- Conversational UI
- Content recommendations
- Natural language queries

#### AISettingsScreen.tsx
**Responsibility:** AI feature configuration.
**Platform:** Cross-platform
**Key Features:**
- AI preferences
- Model selection
- Privacy settings

#### AuthScreen.tsx
**Responsibility:** Authentication and login screen.
**Platform:** Cross-platform
**Key Features:**
- Login forms
- OAuth integration
- Sign up flow

#### BackdropGalleryScreen.tsx
**Responsibility:** Full-screen backdrop image gallery.
**Platform:** Cross-platform
**Key Features:**
- Swipe navigation
- Zoom support
- Image details

#### BackupScreen.tsx
**Responsibility:** Data backup and restore interface.
**Platform:** Cross-platform
**Key Features:**
- Backup creation
- Restore options
- Cloud sync

#### CalendarScreen.tsx
**Responsibility:** Content release calendar.
**Platform:** Cross-platform
**Key Features:**
- Date navigation
- Upcoming releases
- Notifications

#### CastMoviesScreen.tsx
**Responsibility:** Displays all movies featuring a specific cast member.
**Platform:** Cross-platform
**Key Features:**
- Filmography
- Cast filtering
- Grid layout

#### CatalogScreen.tsx / CatalogScreen.tv.tsx
**Responsibility:** Full catalog view of content.
**Platform:** Cross-platform with TV variant
**Key Features:**
- Grid layout
- Filtering
- Sorting
- TV navigation (TV variant)

#### CatalogSettingsScreen.tsx
**Responsibility:** Configure catalog display preferences.
**Platform:** Cross-platform
**Key Features:**
- Catalog visibility
- Order management
- Custom names

#### ContinueWatchingSettingsScreen.tsx
**Responsibility:** Settings for continue watching feature.
**Platform:** Cross-platform
**Key Features:**
- History management
- Auto-removal settings
- Sync preferences

#### ContributorsScreen.tsx
**Responsibility:** Credits for app contributors.
**Platform:** Cross-platform
**Key Features:**
- Contributor list
- Role display
- Links

#### DebridIntegrationScreen.tsx
**Responsibility:** Debrid service (Real-Debrid, etc.) integration.
**Platform:** Cross-platform
**Key Features:**
- Service authentication
- Account status
- Settings

#### DownloadsScreen.tsx
**Responsibility:** Manage downloaded content.
**Platform:** Cross-platform
**Key Features:**
- Download list
- Progress tracking
- Storage management

#### HeroCatalogsScreen.tsx
**Responsibility:** Configure hero section content sources.
**Platform:** Cross-platform
**Key Features:**
- Source selection
- Priority ordering
- Preview

#### HomeScreen.tsx / HomeScreen.tv.tsx
**Responsibility:** Main home screen with featured content and catalogs.
**Platform:** Cross-platform with TV variant
**Key Features:**
- Hero carousel
- Continue watching
- Catalog sections
- This week section
- Progressive loading
- TV-optimized focus (TV variant)

#### HomeScreenSettings.tsx
**Responsibility:** Home screen customization settings.
**Platform:** Cross-platform
**Key Features:**
- Layout options
- Section visibility
- Hero style selection

#### LibraryScreen.tsx / LibraryScreen.tv.tsx
**Responsibility:** User's personal library of saved content.
**Platform:** Cross-platform with TV variant
**Key Features:**
- Library browsing
- Filtering
- Categories
- TV grid layout (TV variant)

#### MDBListSettingsScreen.tsx
**Responsibility:** MDBList integration settings.
**Platform:** Cross-platform
**Key Features:**
- List sync
- Authentication
- Import options

#### MetadataScreen.tsx / MetadataScreen.tv.tsx
**Responsibility:** Detailed content information page.
**Platform:** Cross-platform with TV variant
**Key Features:**
- Hero section
- Cast & crew
- Episodes (series)
- Trailers
- Recommendations
- TV-optimized scrolling (TV variant)

#### NotificationSettingsScreen.tsx
**Responsibility:** Notification preferences.
**Platform:** Cross-platform
**Key Features:**
- Notification types
- Frequency settings
- Permission management

#### OnboardingScreen.tsx
**Responsibility:** First-time user onboarding flow.
**Platform:** Cross-platform
**Key Features:**
- Welcome screens
- Feature introduction
- Initial setup

#### PlayerSettingsScreen.tsx / PlayerSettingsScreen.tv.tsx
**Responsibility:** Video player configuration.
**Platform:** Cross-platform with TV variant
**Key Features:**
- Playback settings
- Subtitle preferences
- Quality defaults
- TV-specific controls (TV variant)

#### PluginsScreen.tsx
**Responsibility:** Plugin/extension management.
**Platform:** Cross-platform
**Key Features:**
- Plugin catalog
- Installation
- Configuration

#### ProfileSelectorScreen.tsx
**Responsibility:** Profile selection interface.
**Platform:** Cross-platform
**Key Features:**
- Profile grid
- Add profile
- PIN entry

#### ProfilesScreen.tsx
**Responsibility:** Profile management screen.
**Platform:** Cross-platform
**Key Features:**
- Profile editing
- Avatar changes
- PIN management
- Kids mode toggle

#### SearchScreen.tsx / SearchScreen.tv.tsx
**Responsibility:** Content search interface.
**Platform:** Cross-platform with TV variant
**Key Features:**
- Search input
- Results grid
- Filters
- Recent searches
- TV keyboard (TV variant)

#### SettingsScreen.tsx / SettingsScreen.tv.tsx
**Responsibility:** Main settings hub.
**Platform:** Cross-platform with TV variant
**Key Features:**
- Settings categories
- Quick access
- Account info
- TV navigation (TV variant)

#### ShowRatingsScreen.tsx
**Responsibility:** Display and manage content ratings.
**Platform:** Cross-platform
**Key Features:**
- Rating history
- Rating management
- Trakt sync

#### StreamsScreen.tsx / StreamsScreen.tv.tsx
**Responsibility:** Stream selection for content playback.
**Platform:** Cross-platform with TV variant
**Key Features:**
- Stream list
- Quality sorting
- Provider filtering
- Episode hero section
- TV focus handling (TV variant)

#### ThemeScreen.tsx / ThemeScreen.tv.tsx
**Responsibility:** App theme customization.
**Platform:** Cross-platform with TV variant
**Key Features:**
- Theme selection
- Color customization
- Preview
- TV-optimized layout (TV variant)

#### TMDBSettingsScreen.tsx
**Responsibility:** TMDB integration settings.
**Platform:** Cross-platform
**Key Features:**
- API configuration
- Image quality
- Language preferences

#### TraktSettingsScreen.tsx
**Responsibility:** Trakt.tv integration settings.
**Platform:** Cross-platform
**Key Features:**
- Authentication
- Sync settings
- Scrobbling options

#### UpdateScreen.tsx
**Responsibility:** App update information and installation.
**Platform:** Cross-platform
**Key Features:**
- Version info
- Changelog
- Update prompt

---

### Settings Screens

#### settings/AboutSettingsScreen.tsx
**Responsibility:** App information and credits.
**Platform:** Cross-platform
**Key Features:**
- Version info
- License information
- Credits

#### settings/AppearanceSettingsScreen.tsx
**Responsibility:** Visual appearance settings.
**Platform:** Cross-platform
**Key Features:**
- Theme selection
- Font size
- Layout options

#### settings/ContentDiscoverySettingsScreen.tsx
**Responsibility:** Content discovery preferences.
**Platform:** Cross-platform
**Key Features:**
- Recommendation settings
- Content filters
- Discovery sources

#### settings/DeveloperSettingsScreen.tsx
**Responsibility:** Advanced developer/debug settings.
**Platform:** Cross-platform
**Key Features:**
- Debug options
- Logging
- Performance metrics

#### settings/IntegrationsSettingsScreen.tsx
**Responsibility:** Third-party integration management.
**Platform:** Cross-platform
**Key Features:**
- Service connections
- API keys
- Sync settings

#### settings/PlaybackSettingsScreen.tsx
**Responsibility:** Playback behavior settings.
**Platform:** Cross-platform
**Key Features:**
- Auto-play
- Quality preferences
- Network settings

#### settings/SettingsComponents.tsx
**Responsibility:** Reusable settings UI components.
**Platform:** Cross-platform
**Key Features:**
- Setting rows
- Toggle switches
- Input fields

#### settings/index.ts
**Responsibility:** Settings screen exports.

---

### Stream Screens

Located in `src/screens/streams/`, these are specialized components for the StreamsScreen:

#### components/EpisodeHero.tsx
**Responsibility:** Hero section for episode stream selection.
**Platform:** Cross-platform
**Key Features:**
- Episode backdrop
- Episode info
- Stream actions

#### components/MobileStreamsLayout.tsx
**Responsibility:** Mobile-optimized stream list layout.
**Platform:** Mobile
**Key Features:**
- Compact list
- Touch optimization
- Sorting controls

#### components/MovieHero.tsx
**Responsibility:** Hero section for movie stream selection.
**Platform:** Cross-platform
**Key Features:**
- Movie backdrop
- Movie info
- Stream actions

#### components/StreamsList.tsx
**Responsibility:** List component for available streams.
**Platform:** Cross-platform
**Key Features:**
- Stream cards
- Filtering
- Sorting

#### StreamsScreen.tsx
**Responsibility:** Main stream selection implementation.
**Platform:** Cross-platform
**Key Features:**
- Stream loading
- Quality filtering
- Provider management

#### constants.ts / styles.ts / types.ts / utils.ts
**Responsibility:** Stream screen utilities and definitions.

#### useStreamsScreen.ts
**Responsibility:** Custom hook for stream screen logic.
**Key Features:**
- Stream fetching
- State management
- Filter logic

---

## Platform Variants Summary

The application uses a `.tv.tsx` suffix convention for TV-optimized variants. These variants provide:

### TV-Specific Features:
- **D-pad Navigation:** Optimized spatial navigation for TV remotes
- **Focus Indicators:** Visual feedback for focused elements (borders, scale, glow)
- **Larger Touch Targets:** TV-safe sizing for remote selection
- **Simplified Layouts:** Reduced visual complexity for 10-foot viewing
- **Voice Search:** Integration with platform voice assistants
- **Gesture-Free Controls:** All interactions accessible via remote buttons

### Components with TV Variants:
1. **ProviderFilter** - TV-optimized filtering interface
2. **StreamCard** - Enhanced focus states and sizing
3. **Focusable** - Core TV navigation component
4. **TVTextInput** - Virtual keyboard for TV
5. **CatalogSection** - TV grid layout with focus management
6. **ContentItem** - TV focus effects and animations
7. **AppleTVHero** - TV-optimized hero section
8. **HeroCarousel** - Remote-controlled carousel
9. **CastSection** - TV navigation for cast members
10. **HeroSection** - TV-optimized metadata hero
11. **SeriesContent** - TV episode navigation
12. **AndroidVideoPlayer** - TV player controls
13. **PlayerControls** - TV remote integration
14. **TVBackHandler** - TV back button handling
15. **TVContextMenu** - TV menu navigation
16. **TVFocusGuard** - Focus boundary management
17. **TVNavigationBackHandlerProvider** - Navigation context
18. **TVScreenWrapper** - TV screen container
19. **TVVoiceSearch** - Voice search integration

### Screens with TV Variants:
1. **CatalogScreen** - Grid layout with TV focus
2. **HomeScreen** - TV-optimized home with focus
3. **LibraryScreen** - TV grid and navigation
4. **MetadataScreen** - TV-optimized scrolling and focus
5. **PlayerSettingsScreen** - TV settings interface
6. **SearchScreen** - TV keyboard and results
7. **SettingsScreen** - TV navigation for settings
8. **StreamsScreen** - TV stream selection
9. **ThemeScreen** - TV theme selection

---

## Architecture Patterns

### Component Organization:
- **Root Level:** Global components and utilities
- **Common:** Shared, reusable components
- **Feature Folders:** Domain-specific components
- **Platform Variants:** Separate `.tv.tsx` files for TV optimization

### Key Patterns:
1. **Focusable Wrapper:** Universal component for TV navigation
2. **Responsive Design:** Breakpoint-based layouts
3. **Progressive Loading:** Performance optimization for catalogs
4. **Memoization:** React.memo and useMemo for performance
5. **Reanimated:** Gesture and animation library
6. **Context Providers:** Global state management
7. **Custom Hooks:** Reusable logic extraction

---

## Performance Optimizations

### Memory Management:
- FastImage for optimized image caching
- Progressive catalog loading
- Virtualized lists (FlashList)
- Memory cache clearing on background

### Animation Optimizations:
- Reanimated worklets
- Native driver animations
- Throttled scroll handlers
- RequestAnimationFrame for scroll

### Loading Strategies:
- Skeleton screens
- Lazy loading
- Image preloading
- Batch rendering

---

## Dependencies

### Key Libraries:
- **React Native:** Core framework
- **React Navigation:** Navigation
- **Reanimated:** Animations
- **FlashList:** Performance lists
- **FastImage:** Image caching
- **Expo:** Platform APIs
- **MMKV:** Fast storage

---

## Notes

This inventory reflects the current state of the React Native application. For detailed implementation information, refer to individual component files. TV-specific variants are marked with the `.tv.tsx` extension and provide optimized experiences for TV platforms (Android TV, Apple TV, Fire TV).
