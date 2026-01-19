package com.nuvio.app.tv.player.ui

import android.content.res.Configuration
import android.app.UiModeManager
import android.content.Context
import androidx.annotation.OptIn
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.util.UnstableApi
import androidx.media3.ui.PlayerView
import androidx.media3.ui.CaptionStyleCompat
import com.nuvio.app.tv.player.ExoPlayerHolder
import com.nuvio.app.tv.player.PlayerViewModel
import com.nuvio.app.tv.player.SubtitleBackgroundColor
import com.nuvio.app.tv.player.SubtitleTextColor

@OptIn(UnstableApi::class)
@Composable
fun VideoPlayerScreen(
    url: String,
    title: String,
    exoPlayerHolder: ExoPlayerHolder,
    viewModel: PlayerViewModel,
    showSkipButton: Boolean,
    onSkipIntro: () -> Unit,
    onBackPressed: () -> Unit
) {
    val context = LocalContext.current
    val player = remember { exoPlayerHolder.getPlayer() }
    val controlsState by viewModel.controlsState.collectAsState()

    val uiModeManager = context.getSystemService(Context.UI_MODE_SERVICE) as UiModeManager
    val isTv = uiModeManager.currentModeType == Configuration.UI_MODE_TYPE_TELEVISION

    var error by remember { mutableStateOf<String?>(null) }
    var playerView by remember { mutableStateOf<PlayerView?>(null) }

    LaunchedEffect(url) {
        // Build MediaItem with proper MIME type detection for HLS/DASH
        val mediaItemBuilder = MediaItem.Builder().setUri(url)

        // Auto-detect stream type based on URL
        when {
            url.contains(".m3u8", ignoreCase = true) -> {
                mediaItemBuilder.setMimeType(androidx.media3.common.MimeTypes.APPLICATION_M3U8)
            }
            url.contains(".mpd", ignoreCase = true) -> {
                mediaItemBuilder.setMimeType(androidx.media3.common.MimeTypes.APPLICATION_MPD)
            }
        }

        val mediaItem = mediaItemBuilder.build()
        player.setMediaItem(mediaItem)
        player.prepare()
        player.playWhenReady = true

        val listener = object : androidx.media3.common.Player.Listener {
            override fun onPlayerError(e: androidx.media3.common.PlaybackException) {
                error = "Playback Error: ${e.message}"
            }

            override fun onTracksChanged(tracks: androidx.media3.common.Tracks) {
                viewModel.refreshAvailableTracks()
            }
        }
        player.addListener(listener)
    }

    LaunchedEffect(controlsState.subtitleSettings) {
        playerView?.let { view ->
            val settings = controlsState.subtitleSettings

            val textColor = when (settings.textColor) {
                SubtitleTextColor.WHITE -> android.graphics.Color.WHITE
                SubtitleTextColor.YELLOW -> android.graphics.Color.YELLOW
                SubtitleTextColor.CYAN -> android.graphics.Color.CYAN
            }

            val bgColor = when (settings.backgroundColor) {
                SubtitleBackgroundColor.TRANSPARENT -> android.graphics.Color.TRANSPARENT
                SubtitleBackgroundColor.BLACK -> android.graphics.Color.BLACK
                SubtitleBackgroundColor.SEMI_TRANSPARENT -> android.graphics.Color.argb(128, 0, 0, 0)
            }

            val captionStyle = CaptionStyleCompat(
                textColor,
                bgColor,
                android.graphics.Color.TRANSPARENT,
                CaptionStyleCompat.EDGE_TYPE_NONE,
                android.graphics.Color.WHITE,
                null
            )

            view.subtitleView?.apply {
                setStyle(captionStyle)
                setFixedTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 16f * settings.fontSize.scale)
            }
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            player.stop()
            // Remove listener if we had a reference, but here it's local to LaunchedEffect scope 
            // which isn't ideal for removal. 
            // Better to manage it separately if needed, but for now Player release clears listeners.
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        if (error != null) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(androidx.compose.ui.graphics.Color.Black),
                contentAlignment = androidx.compose.ui.Alignment.Center
            ) {
                androidx.compose.material3.Text(
                    text = error!!,
                    color = androidx.compose.ui.graphics.Color.Red,
                    style = androidx.compose.material3.MaterialTheme.typography.bodyLarge
                )
            }
        } else {
            AndroidView(
                factory = {
                    PlayerView(context).apply {
                        this.player = player
                        useController = false // We use custom controls
                        playerView = this
                    }
                },
                modifier = Modifier.fillMaxSize()
            )
            
            if (isTv) {
                TvControls(
                    player = player,
                    title = title,
                    showSkipButton = showSkipButton,
                    onSkipIntro = onSkipIntro,
                    onBackPressed = onBackPressed,
                    controlsState = controlsState,
                    onAudioTrackSelected = { viewModel.selectAudioTrack(it) },
                    onSubtitleTrackSelected = { viewModel.selectSubtitleTrack(it) },
                    onSubtitleSettingsChanged = { viewModel.updateSubtitleSettings(it) },
                    onPlaybackSpeedChanged = { viewModel.setPlaybackSpeed(it) },
                    onQualitySelected = { viewModel.selectQuality(it) }
                )
            } else {
                MobileControls(
                    player = player,
                    title = title,
                    showSkipButton = showSkipButton,
                    onSkipIntro = onSkipIntro,
                    onBackPressed = onBackPressed,
                    controlsState = controlsState,
                    onAudioTrackSelected = { viewModel.selectAudioTrack(it) },
                    onSubtitleTrackSelected = { viewModel.selectSubtitleTrack(it) },
                    onSubtitleSettingsChanged = { viewModel.updateSubtitleSettings(it) },
                    onPlaybackSpeedChanged = { viewModel.setPlaybackSpeed(it) },
                    onQualitySelected = { viewModel.selectQuality(it) }
                )
            }
        }
    }
}
