package com.nuvio.app.tv.player.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.unit.dp
import androidx.media3.common.Player
import kotlinx.coroutines.delay
import java.util.concurrent.TimeUnit

@Composable
fun TvControls(
    player: Player,
    title: String,
    showSkipButton: Boolean,
    onSkipIntro: () -> Unit,
    onBackPressed: () -> Unit,
    modifier: Modifier = Modifier
) {
    var isVisible by remember { mutableStateOf(true) }
    var isPlaying by remember { mutableStateOf(player.isPlaying) }
    var duration by remember { mutableLongStateOf(player.duration.coerceAtLeast(0L)) }
    var currentPosition by remember { mutableLongStateOf(player.currentPosition.coerceAtLeast(0L)) }
    
    val playPauseFocusRequester = remember { FocusRequester() }
    
    // Auto-hide controls
    LaunchedEffect(isVisible, isPlaying) {
        if (isVisible && isPlaying) {
            playPauseFocusRequester.requestFocus() // Ensure focus when shown
            delay(4000)
            isVisible = false
        }
    }

    // Update progress
    LaunchedEffect(player) {
        while (true) {
            isPlaying = player.isPlaying
            duration = player.duration.coerceAtLeast(0L)
            currentPosition = player.currentPosition.coerceAtLeast(0L)
            delay(500)
        }
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .onPreviewKeyEvent { keyEvent ->
                // Show controls on any key press if hidden
                if (!isVisible && keyEvent.type == KeyEventType.KeyDown) {
                    isVisible = true
                    // Reset hide timer
                    return@onPreviewKeyEvent true
                }
                
                // If visible, handle back button to hide controls instead of activity back
                if (isVisible && keyEvent.key == Key.Back && keyEvent.type == KeyEventType.KeyUp) {
                    isVisible = false
                    return@onPreviewKeyEvent true
                }
                
                // D-Pad navigation logic for seeking if needed
                if (isVisible && (keyEvent.key == Key.DirectionRight || keyEvent.key == Key.DirectionLeft)) {
                     // Implement manual seeking logic here if slider doesn't handle it
                }
                
                false
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
                                Color.Black.copy(alpha = 0.8f),
                                Color.Transparent,
                                Color.Black.copy(alpha = 0.9f)
                            )
                        )
                    )
            ) {
                // Top Bar
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .align(Alignment.TopCenter)
                        .padding(32.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = title,
                        style = MaterialTheme.typography.headlineMedium,
                        color = Color.White
                    )
                    Spacer(Modifier.weight(1f))
                }

                // Center Play/Pause
                IconButton(
                    onClick = {
                        if (player.isPlaying) player.pause() else player.play()
                        isPlaying = !isPlaying
                    },
                    modifier = Modifier
                        .align(Alignment.Center)
                        .size(80.dp)
                        .focusRequester(playPauseFocusRequester)
                        .onFocusChanged { 
                             // Could add visual indication of focus here beyond standard ripple
                        }
                        .focusable()
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
                            .padding(bottom = 120.dp, end = 48.dp)
                    ) {
                        androidx.compose.material3.Button(
                            onClick = onSkipIntro,
                            colors = androidx.compose.material3.ButtonDefaults.buttonColors(
                                containerColor = Color.White,
                                contentColor = Color.Black
                            ),
                            modifier = Modifier.focusable()
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
                        .padding(32.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(formatTime(currentPosition), color = Color.White, style = MaterialTheme.typography.bodyLarge)
                        Text(formatTime(duration), color = Color.White, style = MaterialTheme.typography.bodyLarge)
                    }
                    Slider(
                        value = currentPosition.toFloat(),
                        onValueChange = { player.seekTo(it.toLong()) },
                        valueRange = 0f..duration.toFloat(),
                        colors = SliderDefaults.colors(
                            thumbColor = MaterialTheme.colorScheme.primary,
                            activeTrackColor = MaterialTheme.colorScheme.primary,
                            inactiveTrackColor = Color.White.copy(alpha = 0.3f)
                        ),
                        modifier = Modifier.focusable()
                    )
                }
            }
        }
    }
}

private fun formatTime(millis: Long): String {
    val minutes = TimeUnit.MILLISECONDS.toMinutes(millis)
    val seconds = TimeUnit.MILLISECONDS.toSeconds(millis) % 60
    return String.format("%02d:%02d", minutes, seconds)
}
