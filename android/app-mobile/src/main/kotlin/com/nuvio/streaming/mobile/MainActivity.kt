package com.nuvio.streaming.mobile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import com.nuvio.streaming.mobile.ui.theme.NuvioTheme
import dagger.hilt.android.AndroidEntryPoint

/**
 * Main activity for the Nuvio Streaming mobile application (phone/tablet).
 *
 * This activity serves as the primary entry point for the mobile app's user interface.
 * It uses Jetpack Compose for declarative UI with Material 3 design system integration.
 *
 * ## Architecture
 *
 * - **Hilt Integration**: @AndroidEntryPoint enables dependency injection for ViewModels
 *   and other components injected into this activity.
 * - **Compose UI**: Uses setContent() to render the app's UI hierarchy using Compose.
 * - **Material 3**: Applies Material You design system via NuvioTheme composable.
 * - **Edge-to-Edge**: Enables immersive display mode for modern Android devices.
 *
 * ## UI Structure
 *
 * The activity implements a basic scaffold pattern with:
 * - Edge-to-edge display for immersive experience
 * - Material 3 theming with support for light/dark modes and dynamic color
 * - Scaffold component for standard Material Design layout structure
 * - Placeholder content (to be replaced with navigation and feature screens)
 *
 * ## Future Development
 *
 * This is the initial scaffold. Future enhancements will include:
 * - Navigation host for multi-screen flows (using Jetpack Navigation Compose)
 * - Authentication screens (login, registration)
 * - Content browsing interface (movies, TV shows, live streams)
 * - Video playback integration with ExoPlayer
 * - User profile and settings screens
 * - Bottom navigation or navigation drawer for main sections
 *
 * ## Usage
 *
 * This activity is declared as the launcher activity in AndroidManifest.xml:
 * ```xml
 * <activity
 *     android:name=".MainActivity"
 *     android:exported="true">
 *     <intent-filter>
 *         <action android:name="android.intent.action.MAIN" />
 *         <category android:name="android.intent.category.LAUNCHER" />
 *     </intent-filter>
 * </activity>
 * ```
 *
 * @see MobileApplication for app initialization and Hilt setup
 * @see NuvioTheme for theme configuration
 */
@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Enable edge-to-edge display for immersive experience
        enableEdgeToEdge()

        setContent {
            NuvioTheme {
                // Use Scaffold for standard Material Design layout structure
                Scaffold(modifier = Modifier.fillMaxSize()) { innerPadding ->
                    MainContent(modifier = Modifier.padding(innerPadding))
                }
            }
        }
    }
}

/**
 * Main content composable for the home screen.
 *
 * This is a placeholder implementation that displays a welcome message.
 * In production, this will be replaced with:
 * - NavHost for navigation between screens
 * - Content browsing UI (grid/list of media items)
 * - Featured content carousel
 * - Search functionality
 * - User profile access
 *
 * @param modifier Modifier to be applied to the root composable.
 */
@Composable
private fun MainContent(modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "Nuvio Streaming",
                style = MaterialTheme.typography.headlineLarge,
                color = MaterialTheme.colorScheme.primary
            )
        }
    }
}

/**
 * Preview for the main content in light mode.
 *
 * This preview is visible in Android Studio's Compose Preview pane,
 * allowing developers to see UI changes without building and running the app.
 */
@Preview(showBackground = true, name = "Main Content Light")
@Composable
private fun MainContentPreview() {
    NuvioTheme(darkTheme = false) {
        MainContent()
    }
}

/**
 * Preview for the main content in dark mode.
 *
 * Tests the UI appearance with dark theme colors to ensure proper contrast
 * and readability in low-light conditions.
 */
@Preview(showBackground = true, name = "Main Content Dark")
@Composable
private fun MainContentDarkPreview() {
    NuvioTheme(darkTheme = true) {
        MainContent()
    }
}
