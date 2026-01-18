package com.nuvio.streaming.mobile.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext

/**
 * Material 3 (Material You) theme configuration for the Nuvio Streaming mobile app.
 *
 * This file defines the app's theming system using Jetpack Compose Material 3 components.
 * It provides both light and dark theme variants with support for dynamic color theming
 * on Android 12+ devices.
 *
 * ## Dynamic Color Support
 *
 * On Android 12 (API 31) and above, the app can automatically adapt its color scheme
 * to match the user's wallpaper using Material You's dynamic color system. This provides
 * a personalized experience that feels integrated with the device's system UI.
 *
 * For devices running Android 11 and below, the app falls back to a static color palette
 * defined in Color.kt.
 *
 * ## Theme Modes
 *
 * - **Light Mode**: High contrast theme optimized for daylight viewing
 * - **Dark Mode**: Reduced luminance theme for low-light environments, following
 *   Material 3 dark theme guidelines for improved readability and reduced eye strain
 *
 * ## Usage
 *
 * Wrap your app's content in the NuvioTheme composable:
 *
 * ```kotlin
 * @Composable
 * fun MyScreen() {
 *     NuvioTheme(
 *         darkTheme = isSystemInDarkTheme(),
 *         dynamicColor = true  // Enable Material You dynamic colors
 *     ) {
 *         // Your UI content here
 *         Surface(modifier = Modifier.fillMaxSize()) {
 *             Text("Hello Nuvio!")
 *         }
 *     }
 * }
 * ```
 *
 * ## Typography and Shapes
 *
 * Material 3 provides default typography and shape systems. For custom typography
 * or shapes, you can extend this theme by creating Typography.kt and Shape.kt files
 * and passing them to MaterialTheme().
 *
 * @see Color.kt for color palette definitions
 */

/**
 * Light color scheme for the app using static Material 3 colors.
 *
 * This scheme is used when:
 * - Dynamic color is disabled, OR
 * - The device is running Android 11 or below (API < 31)
 */
private val LightColorScheme = lightColorScheme(
    primary = md_theme_light_primary,
    onPrimary = md_theme_light_onPrimary,
    primaryContainer = md_theme_light_primaryContainer,
    onPrimaryContainer = md_theme_light_onPrimaryContainer,
    secondary = md_theme_light_secondary,
    onSecondary = md_theme_light_onSecondary,
    secondaryContainer = md_theme_light_secondaryContainer,
    onSecondaryContainer = md_theme_light_onSecondaryContainer,
    tertiary = md_theme_light_tertiary,
    onTertiary = md_theme_light_onTertiary,
    tertiaryContainer = md_theme_light_tertiaryContainer,
    onTertiaryContainer = md_theme_light_onTertiaryContainer,
    error = md_theme_light_error,
    errorContainer = md_theme_light_errorContainer,
    onError = md_theme_light_onError,
    onErrorContainer = md_theme_light_onErrorContainer,
    background = md_theme_light_background,
    onBackground = md_theme_light_onBackground,
    surface = md_theme_light_surface,
    onSurface = md_theme_light_onSurface,
    surfaceVariant = md_theme_light_surfaceVariant,
    onSurfaceVariant = md_theme_light_onSurfaceVariant,
    outline = md_theme_light_outline,
    inverseOnSurface = md_theme_light_inverseOnSurface,
    inverseSurface = md_theme_light_inverseSurface,
    inversePrimary = md_theme_light_inversePrimary,
    surfaceTint = md_theme_light_surfaceTint,
    outlineVariant = md_theme_light_outlineVariant,
    scrim = md_theme_light_scrim,
)

/**
 * Dark color scheme for the app using static Material 3 colors.
 *
 * This scheme is used when:
 * - Dynamic color is disabled, OR
 * - The device is running Android 11 or below (API < 31)
 */
private val DarkColorScheme = darkColorScheme(
    primary = md_theme_dark_primary,
    onPrimary = md_theme_dark_onPrimary,
    primaryContainer = md_theme_dark_primaryContainer,
    onPrimaryContainer = md_theme_dark_onPrimaryContainer,
    secondary = md_theme_dark_secondary,
    onSecondary = md_theme_dark_onSecondary,
    secondaryContainer = md_theme_dark_secondaryContainer,
    onSecondaryContainer = md_theme_dark_onSecondaryContainer,
    tertiary = md_theme_dark_tertiary,
    onTertiary = md_theme_dark_onTertiary,
    tertiaryContainer = md_theme_dark_tertiaryContainer,
    onTertiaryContainer = md_theme_dark_onTertiaryContainer,
    error = md_theme_dark_error,
    errorContainer = md_theme_dark_errorContainer,
    onError = md_theme_dark_onError,
    onErrorContainer = md_theme_dark_onErrorContainer,
    background = md_theme_dark_background,
    onBackground = md_theme_dark_onBackground,
    surface = md_theme_dark_surface,
    onSurface = md_theme_dark_onSurface,
    surfaceVariant = md_theme_dark_surfaceVariant,
    onSurfaceVariant = md_theme_dark_onSurfaceVariant,
    outline = md_theme_dark_outline,
    inverseOnSurface = md_theme_dark_inverseOnSurface,
    inverseSurface = md_theme_dark_inverseSurface,
    inversePrimary = md_theme_dark_inversePrimary,
    surfaceTint = md_theme_dark_surfaceTint,
    outlineVariant = md_theme_dark_outlineVariant,
    scrim = md_theme_dark_scrim,
)

/**
 * Main theme composable for the Nuvio Streaming mobile application.
 *
 * This composable applies the Material 3 theme to all child composables, providing
 * consistent styling, colors, typography, and shapes throughout the app.
 *
 * @param darkTheme Whether to use dark theme. Defaults to system setting via [isSystemInDarkTheme].
 * @param dynamicColor Whether to use dynamic theming from Material You (Android 12+).
 *                     When true and supported, colors adapt to the user's wallpaper.
 *                     When false or on older devices, uses static color palette from Color.kt.
 *                     Defaults to true.
 * @param content The composable content to be themed.
 */
@Composable
fun NuvioTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = true,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        // Use dynamic color scheme on Android 12+ if enabled
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        // Fall back to static color schemes
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}
