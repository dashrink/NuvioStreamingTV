package com.nuvio.streaming.tv

import android.os.Bundle
import android.util.Log
import androidx.fragment.app.FragmentActivity
import androidx.leanback.app.BrowseSupportFragment
import dagger.hilt.android.AndroidEntryPoint

/**
 * Main activity for the Nuvio Streaming Android TV application.
 *
 * This activity serves as the primary entry point for the Android TV app's user interface,
 * using the Android Leanback library for a TV-optimized browsing experience designed
 * for D-pad navigation and 10-foot UI patterns.
 *
 * ## Architecture
 *
 * - **Hilt Integration**: @AndroidEntryPoint enables dependency injection for ViewModels
 *   and repositories injected into this activity and its fragments.
 * - **Leanback UI**: Uses BrowseSupportFragment for the standard Android TV browse experience
 *   with categories, rows, and card-based content presentation.
 * - **D-pad Navigation**: All UI elements are optimized for remote control D-pad input,
 *   with no touchscreen interaction required.
 * - **Fragment-based Architecture**: Uses FragmentActivity as the base class to host
 *   Leanback support library fragments.
 *
 * ## UI Structure
 *
 * The activity implements the standard Android TV browse pattern:
 * - **BrowseSupportFragment**: Displays content in categorized rows
 * - **Headers**: Left sidebar with category navigation (Movies, TV Shows, Live, etc.)
 * - **Rows**: Horizontal scrolling rows of content cards for each category
 * - **Focus Management**: Automatic focus handling for D-pad navigation
 * - **Background Updates**: Dynamic background updates based on focused content
 *
 * ## Future Development
 *
 * This is the initial scaffold. Future enhancements will include:
 * - Content rows with actual media data from the backend API
 * - Custom presenters for different card types (movie, show, live stream)
 * - Search functionality via SearchSupportFragment
 * - Details screen integration for content selection
 * - Video playback activity with ExoPlayer
 * - Settings fragment for user preferences
 * - Recommendations row integration
 * - Voice search support
 *
 * ## Usage
 *
 * This activity is declared as the leanback launcher in AndroidManifest.xml:
 * ```xml
 * <activity
 *     android:name=".TvMainActivity"
 *     android:exported="true"
 *     android:screenOrientation="landscape">
 *     <intent-filter>
 *         <action android:name="android.intent.action.MAIN" />
 *         <category android:name="android.intent.category.LEANBACK_LAUNCHER" />
 *     </intent-filter>
 * </activity>
 * ```
 *
 * ## Android TV Design Guidelines
 *
 * This activity follows Android TV design best practices:
 * - Landscape orientation only (10-foot viewing distance)
 * - Touch-free navigation (D-pad only)
 * - Content-first design with minimal chrome
 * - Clear visual focus indicators
 * - Smooth animations and transitions
 *
 * @see TvApplication for app initialization and Hilt setup
 * @see androidx.leanback.app.BrowseSupportFragment for browse UI implementation
 */
@AndroidEntryPoint
class TvMainActivity : FragmentActivity() {

    private var browseSupportFragment: BrowseSupportFragment? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Log.i(TAG, "Creating TV main activity")

        // For now, we'll create a basic layout programmatically
        // In future iterations, this will use a proper layout XML with BrowseSupportFragment
        setupBrowseFragment()

        Log.i(TAG, "TV main activity created successfully")
    }

    /**
     * Initialize and configure the BrowseSupportFragment for content browsing.
     *
     * This method sets up the main browse UI for the TV app. The fragment will display
     * content in categorized rows with headers for navigation. Currently, this is a
     * placeholder implementation that will be enhanced with:
     * - Content rows loaded from repositories
     * - Custom card presenters for media items
     * - Background image updates based on focus
     * - Search icon in the browse header
     * - Brand color and title configuration
     *
     * The BrowseSupportFragment handles:
     * - Category headers (left sidebar)
     * - Content rows (horizontal card lists)
     * - D-pad focus management
     * - Smooth scrolling and animations
     * - Background dimming for readability
     *
     * ## Implementation Notes
     *
     * The fragment is added to the activity's content view using FragmentManager.
     * In production, you would:
     * 1. Create ObjectAdapter with content rows
     * 2. Set up ArrayObjectAdapter for each row
     * 3. Create custom Presenter classes for cards
     * 4. Implement OnItemViewClickedListener for user interactions
     * 5. Set up BackgroundManager for dynamic backgrounds
     *
     * @see BrowseSupportFragment for detailed API documentation
     */
    private fun setupBrowseFragment() {
        // Create and configure BrowseSupportFragment
        browseSupportFragment = BrowseSupportFragment().apply {
            // Set the title that appears in the browse header
            title = getString(R.string.browse_title)
            headersState = BrowseSupportFragment.HEADERS_ENABLED
            isHeadersTransitionOnBackEnabled = true

            // Brand color will be set from resources once theme is properly configured
            // brandColor = resources.getColor(R.color.primary, theme)
        }

        // Add the fragment to the activity
        supportFragmentManager.beginTransaction()
            .replace(android.R.id.content, browseSupportFragment!!)
            .commit()

        Log.i(TAG, "BrowseSupportFragment initialized")

        // TODO: Set up content rows with ObjectAdapter
        // TODO: Configure card presenters for different content types
        // TODO: Add OnItemViewClickedListener for navigation to details
        // TODO: Set up BackgroundManager for dynamic backgrounds
        // TODO: Add search functionality
    }

    override fun onDestroy() {
        super.onDestroy()
        browseSupportFragment = null
        Log.i(TAG, "TV main activity destroyed")
    }

    companion object {
        private const val TAG = "TvMainActivity"
    }
}
