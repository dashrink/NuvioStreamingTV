package com.nuvio.app.tv.ui.home

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.nuvio.app.tv.data.repository.Meta
import com.nuvio.app.tv.ui.theme.HeroGradient
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.abs

@Composable
fun HeroCarousel(
    items: List<Meta>,
    onPlayClick: (Meta) -> Unit,
    onInfoClick: (Meta) -> Unit,
    modifier: Modifier = Modifier,
    autoAdvanceDelayMs: Long = 5000L
) {
    var currentIndex by remember { mutableStateOf(0) }
    var isPaused by remember { mutableStateOf(false) }
    val currentItem = items.getOrNull(currentIndex)
    val scope = rememberCoroutineScope()

    // Auto-advance functionality
    LaunchedEffect(currentIndex, isPaused) {
        if (!isPaused && items.size > 1) {
            delay(autoAdvanceDelayMs)
            currentIndex = (currentIndex + 1) % items.size
        }
    }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(450.dp)
            .pointerInput(Unit) {
                detectHorizontalDragGestures(
                    onDragEnd = {
                        isPaused = false
                    },
                    onHorizontalDrag = { change, dragAmount ->
                        change.consume()
                        isPaused = true

                        if (abs(dragAmount) > 50f) {
                            scope.launch {
                                if (dragAmount > 0 && currentIndex > 0) {
                                    currentIndex -= 1
                                } else if (dragAmount < 0 && currentIndex < items.size - 1) {
                                    currentIndex += 1
                                }
                            }
                        }
                    }
                )
            }
    ) {
        // Background Image with Gradient Overlays
        currentItem?.backgroundUrl?.let { url ->
            AsyncImage(
                model = url,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )
        }

        // Gradients for readability
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(HeroGradient)
                )
        )
        
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.horizontalGradient(
                        listOf(Color.Black.copy(alpha = 0.8f), Color.Transparent),
                        startX = 0f,
                        endX = 1000f
                    )
                )
        )

        // Content Information
        Column(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(start = 48.dp, bottom = 64.dp)
                .widthIn(max = 500.dp)
        ) {
            currentItem?.let { meta ->
                Text(
                    text = meta.name,
                    style = MaterialTheme.typography.displayLarge,
                    color = Color.White,
                    fontWeight = FontWeight.Bold
                )
                
                Spacer(modifier = Modifier.height(16.dp))
                
                meta.description?.let { desc ->
                    Text(
                        text = desc,
                        style = MaterialTheme.typography.bodyLarge,
                        color = Color.White.copy(alpha = 0.8f),
                        maxLines = 3
                    )
                }
                
                Spacer(modifier = Modifier.height(24.dp))
                
                Row {
                    Button(
                        onClick = { onPlayClick(meta) },
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                        shape = MaterialTheme.shapes.small
                    ) {
                        Text("Play", fontWeight = FontWeight.Bold)
                    }
                    
                    Spacer(modifier = Modifier.width(16.dp))
                    
                    Button(
                        onClick = { onInfoClick(meta) },
                        colors = ButtonDefaults.buttonColors(containerColor = Color.White.copy(alpha = 0.2f)),
                        shape = MaterialTheme.shapes.small
                    ) {
                        Text("More Info", color = Color.White)
                    }
                }
            }
        }

        // Carousel Indicators
        if (items.size > 1) {
            Row(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 24.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items.indices.forEach { index ->
                    val size by animateDpAsState(
                        targetValue = if (index == currentIndex) 12.dp else 8.dp,
                        animationSpec = tween(300),
                        label = "indicator_size"
                    )
                    Box(
                        modifier = Modifier
                            .size(size)
                            .background(
                                color = if (index == currentIndex) {
                                    MaterialTheme.colorScheme.primary
                                } else {
                                    Color.White.copy(alpha = 0.5f)
                                },
                                shape = MaterialTheme.shapes.small
                            )
                    )
                }
            }
        }
    }
}
