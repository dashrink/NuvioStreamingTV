package com.nuvio.app.tv.player.ui

import android.app.Activity
import android.provider.Settings
import android.view.WindowManager
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectVerticalDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.AudioFile
import androidx.compose.material.icons.filled.HighQuality
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material.icons.filled.Subtitles
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.media3.common.Player
import kotlinx.coroutines.delay
import java.util.concurrent.TimeUnit

@Composable
fun MobileControls(
    player: Player,
    title: String,
    showSkipButton: Boolean,
    onSkipIntro: () -> Unit,
    onBackPressed: () -> Unit,
    modifier: Modifier = Modifier,
    controlsState: com.nuvio.app.tv.player.PlayerControlsState = com.nuvio.app.tv.player.PlayerControlsState(),
    onAudioTrackSelected: (String) -> Unit = {},
    onSubtitleTrackSelected: (String) -> Unit = {},
    onSubtitleSettingsChanged: (com.nuvio.app.tv.player.SubtitleSettings) -> Unit = {},
    onPlaybackSpeedChanged: (Float) -> Unit = {},
    onQualitySelected: (com.nuvio.app.tv.player.QualityOption) -> Unit = {}
) {
    var isVisible by remember { mutableStateOf(true) }
    var isPlaying by remember { mutableStateOf(player.isPlaying) }
    var duration by remember { mutableLongStateOf(player.duration.coerceAtLeast(0L)) }
    var currentPosition by remember { mutableLongStateOf(player.currentPosition.coerceAtLeast(0L)) }
    var bufferedPosition by remember { mutableLongStateOf(player.bufferedPosition.coerceAtLeast(0L)) }

    var showSettingsMenu by remember { mutableStateOf(false) }
    var showAudioDialog by remember { mutableStateOf(false) }
    var showSubtitleDialog by remember { mutableStateOf(false) }
    var showSubtitleSettingsDialog by remember { mutableStateOf(false) }
    var showSpeedDialog by remember { mutableStateOf(false) }
    var showQualityDialog by remember { mutableStateOf(false) }
    
    // Auto-hide controls
    LaunchedEffect(isVisible, isPlaying) {
        if (isVisible && isPlaying) {
            delay(3000)
            isVisible = false
        }
    }

    // Update progress
    LaunchedEffect(player) {
        while (true) {
            isPlaying = player.isPlaying
            duration = player.duration.coerceAtLeast(0L)
            currentPosition = player.currentPosition.coerceAtLeast(0L)
            bufferedPosition = player.bufferedPosition.coerceAtLeast(0L)
            delay(500)
        }
    }

    val context = LocalContext.current
    var volume by remember { mutableFloatStateOf(0.5f) }
    var brightness by remember { mutableFloatStateOf(0.5f) }

    Box(
        modifier = modifier
            .fillMaxSize()
            .pointerInput(Unit) {
                detectTapGestures(
                    onTap = { isVisible = !isVisible },
                    onDoubleTap = { offset ->
                        val width = size.width
                        if (offset.x < width / 3) {
                            // Seek back 10s
                            player.seekTo((player.currentPosition - 10000).coerceAtLeast(0))
                        } else if (offset.x > 2 * width / 3) {
                            // Seek forward 10s
                            player.seekTo((player.currentPosition + 10000).coerceAtMost(player.duration))
                        }
                    }
                )
            }
            // Add vertical drag for volume/brightness
            .pointerInput(Unit) {
                detectVerticalDragGestures { change, dragAmount ->
                    val width = size.width
                    val x = change.position.x
                    if (x < width / 2) {
                        // Left side: Brightness
                        brightness = (brightness - dragAmount / 500f).coerceIn(0f, 1f)
                        val window = (context as? Activity)?.window
                        val layoutParams = window?.attributes
                        layoutParams?.screenBrightness = brightness
                        window?.attributes = layoutParams
                    } else {
                        // Right side: Volume
                        // Note: Real volume implementation requires AudioManager
                        // For now we just track visual state
                    }
                }
            }
    ) {
        AnimatedVisibility(
            visible = isVisible,
            enter = fadeIn(),
            exit = fadeOut(),
            modifier = Modifier.fillMaxSize()
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(
                                Color.Black.copy(alpha = 0.7f),
                                Color.Transparent,
                                Color.Black.copy(alpha = 0.7f)
                            )
                        )
                    )
            ) {
                // Top Bar
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .align(Alignment.TopCenter)
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = onBackPressed) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color.White)
                    }
                    Text(
                        text = title,
                        style = MaterialTheme.typography.titleMedium,
                        color = Color.White,
                        modifier = Modifier.padding(start = 16.dp)
                    )
                    Spacer(Modifier.weight(1f))
                    
                    // Cast Button
                    androidx.compose.ui.viewinterop.AndroidView(
                        factory = { ctx ->
                            androidx.mediarouter.app.MediaRouteButton(ctx).apply {
                                androidx.mediarouter.media.MediaRouteSelector.Builder()
                                    .addControlCategory(androidx.mediarouter.media.MediaControlIntent.CATEGORY_REMOTE_PLAYBACK)
                                    .build()
                                    .also { routeSelector = it }
                            }
                        },
                        modifier = Modifier.padding(end = 8.dp)
                    )

                    Box {
                        IconButton(onClick = { showSettingsMenu = true }) {
                            Icon(Icons.Default.MoreVert, contentDescription = "Settings", tint = Color.White)
                        }
                        DropdownMenu(
                            expanded = showSettingsMenu,
                            onDismissRequest = { showSettingsMenu = false }
                        ) {
                            DropdownMenuItem(
                                text = { Text("Quality") },
                                onClick = {
                                    showSettingsMenu = false
                                    showQualityDialog = true
                                },
                                leadingIcon = {
                                    Icon(Icons.Default.HighQuality, contentDescription = null)
                                }
                            )
                            DropdownMenuItem(
                                text = { Text("Subtitles") },
                                onClick = {
                                    showSettingsMenu = false
                                    showSubtitleDialog = true
                                },
                                leadingIcon = {
                                    Icon(Icons.Default.Subtitles, contentDescription = null)
                                }
                            )
                            DropdownMenuItem(
                                text = { Text("Audio Track") },
                                onClick = {
                                    showSettingsMenu = false
                                    showAudioDialog = true
                                },
                                leadingIcon = {
                                    Icon(Icons.Default.AudioFile, contentDescription = null)
                                }
                            )
                            DropdownMenuItem(
                                text = { Text("Playback Speed") },
                                onClick = {
                                    showSettingsMenu = false
                                    showSpeedDialog = true
                                },
                                leadingIcon = {
                                    Icon(Icons.Default.Speed, contentDescription = null)
                                }
                            )
                            DropdownMenuItem(
                                text = { Text("Subtitle Settings") },
                                onClick = {
                                    showSettingsMenu = false
                                    showSubtitleSettingsDialog = true
                                },
                                leadingIcon = {
                                    Icon(Icons.Default.Settings, contentDescription = null)
                                }
                            )
                        }
                    }
                }

                // Center Play/Pause
                IconButton(
                    onClick = {
                        if (player.isPlaying) player.pause() else player.play()
                        isPlaying = !isPlaying
                    },
                    modifier = Modifier.align(Alignment.Center).size(64.dp)
                ) {
                    Icon(
                        imageVector = if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                        contentDescription = "Play/Pause",
                        tint = Color.White,
                        modifier = Modifier.fillMaxSize()
                    )
                }

                // Skip Intro Button
                if (showSkipButton) {
                    Box(
                        modifier = Modifier
                            .align(Alignment.BottomEnd)
                            .padding(bottom = 100.dp, end = 32.dp)
                    ) {
                         androidx.compose.material3.Button(
                            onClick = onSkipIntro,
                            colors = androidx.compose.material3.ButtonDefaults.buttonColors(
                                containerColor = Color.White,
                                contentColor = Color.Black
                            )
                        ) {
                            Text("Skip Intro")
                        }
                    }
                }

                // Bottom Bar
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .align(Alignment.BottomCenter)
                        .padding(16.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(formatTime(currentPosition), color = Color.White)
                        Text(formatTime(duration), color = Color.White)
                    }
                    Slider(
                        value = currentPosition.toFloat(),
                        onValueChange = { player.seekTo(it.toLong()) },
                        valueRange = 0f..duration.toFloat(),
                        colors = SliderDefaults.colors(
                            thumbColor = MaterialTheme.colorScheme.primary,
                            activeTrackColor = MaterialTheme.colorScheme.primary,
                            inactiveTrackColor = Color.White.copy(alpha = 0.3f)
                        )
                    )
                }
            }
        }

        if (showAudioDialog) {
            AudioTrackSelector(
                tracks = controlsState.availableAudioTracks,
                selectedTrackId = controlsState.selectedAudioTrackId,
                onTrackSelected = onAudioTrackSelected,
                onDismiss = { showAudioDialog = false }
            )
        }

        if (showSubtitleDialog) {
            SubtitleTrackSelector(
                tracks = controlsState.availableSubtitles,
                selectedTrackId = controlsState.selectedSubtitleTrackId,
                onTrackSelected = onSubtitleTrackSelected,
                onDismiss = { showSubtitleDialog = false }
            )
        }

        if (showSubtitleSettingsDialog) {
            SubtitleSettingsDialog(
                currentSettings = controlsState.subtitleSettings,
                onApply = onSubtitleSettingsChanged,
                onDismiss = { showSubtitleSettingsDialog = false }
            )
        }

        if (showSpeedDialog) {
            PlaybackSpeedSelector(
                currentSpeed = controlsState.playbackSpeed,
                onSpeedSelected = onPlaybackSpeedChanged,
                onDismiss = { showSpeedDialog = false }
            )
        }

        if (showQualityDialog) {
            QualitySelector(
                qualities = controlsState.availableQualities,
                selectedQuality = controlsState.selectedQuality,
                onQualitySelected = onQualitySelected,
                onDismiss = { showQualityDialog = false }
            )
        }
    }
}

private fun formatTime(millis: Long): String {
    val minutes = TimeUnit.MILLISECONDS.toMinutes(millis)
    val seconds = TimeUnit.MILLISECONDS.toSeconds(millis) % 60
    return String.format("%02d:%02d", minutes, seconds)
}
