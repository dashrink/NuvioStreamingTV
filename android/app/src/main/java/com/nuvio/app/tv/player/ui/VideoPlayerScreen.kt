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
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.common.util.UnstableApi
import androidx.media3.ui.PlayerView
import com.nuvio.app.tv.player.ExoPlayerHolder

@OptIn(UnstableApi::class)
@Composable
fun VideoPlayerScreen(
    url: String,
    title: String,
    exoPlayerHolder: ExoPlayerHolder,
    showSkipButton: Boolean,
    onSkipIntro: () -> Unit,
    onBackPressed: () -> Unit
) {
    val context = LocalContext.current
    val player = remember { exoPlayerHolder.getPlayer() }
    
    val uiModeManager = context.getSystemService(Context.UI_MODE_SERVICE) as UiModeManager
    val isTv = uiModeManager.currentModeType == Configuration.UI_MODE_TYPE_TELEVISION

    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(url) {
        val mediaItem = MediaItem.fromUri(url)
        player.setMediaItem(mediaItem)
        player.prepare()
        player.playWhenReady = true
        
        val listener = object : androidx.media3.common.Player.Listener {
             override fun onPlayerError(e: androidx.media3.common.PlaybackException) {
                 error = "Playback Error: ${e.message}"
             }
        }
        player.addListener(listener)
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
                    onBackPressed = onBackPressed
                )
            } else {
                MobileControls(
                    player = player,
                    title = title,
                    showSkipButton = showSkipButton,
                    onSkipIntro = onSkipIntro,
                    onBackPressed = onBackPressed
                )
            }
        }
    }
}
