package com.nuvio.app.tv.ui.theme

import android.app.Activity
import android.content.res.Configuration
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat
import androidx.compose.material3.MaterialTheme as MobileMaterialTheme
import androidx.compose.material3.darkColorScheme as mobileDarkColorScheme
import androidx.tv.material3.MaterialTheme as TvMaterialTheme
import androidx.tv.material3.darkColorScheme as tvDarkColorScheme

private val MobileDarkColorScheme = mobileDarkColorScheme(
    primary = Primary,
    secondary = Secondary,
    tertiary = OnSurfaceVariant,
    background = Black,
    surface = DarkGrey,
    onPrimary = OnSurface,
    onSecondary = OnSurface,
    onTertiary = OnSurface,
    onBackground = OnSurface,
    onSurface = OnSurface,
    surfaceVariant = SurfaceVariant,
    onSurfaceVariant = OnSurfaceVariant
)

private val TvDarkColorScheme = tvDarkColorScheme(
    primary = Primary,
    secondary = Secondary,
    tertiary = OnSurfaceVariant,
    background = Black,
    surface = DarkGrey,
    onPrimary = OnSurface,
    onSecondary = OnSurface,
    onTertiary = OnSurface,
    onBackground = OnSurface,
    onSurface = OnSurface,
    surfaceVariant = SurfaceVariant,
    onSurfaceVariant = OnSurfaceVariant
)

@Composable
@ReadOnlyComposable
fun isTv(): Boolean {
    val context = LocalContext.current
    val uiMode = context.resources.configuration.uiMode
    return (uiMode and Configuration.UI_MODE_TYPE_MASK) == Configuration.UI_MODE_TYPE_TELEVISION
}

@Composable
fun NuvioTheme(
    darkTheme: Boolean = true, // We focus on dark theme for streaming
    content: @Composable () -> Unit
) {
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = Black.toArgb()
            window.navigationBarColor = Black.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = false
        }
    }

    if (isTv()) {
        TvMaterialTheme(
            colorScheme = TvDarkColorScheme,
            typography = TvTypography
        ) {
            // Also provide Mobile theme for shared components that rely on it
            MobileMaterialTheme(
                colorScheme = MobileDarkColorScheme,
                typography = Typography,
                content = content
            )
        }
    } else {
        MobileMaterialTheme(
            colorScheme = MobileDarkColorScheme,
            typography = Typography,
            content = content
        )
    }
}
