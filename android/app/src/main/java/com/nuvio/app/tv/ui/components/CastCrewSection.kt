package com.nuvio.app.tv.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

@Composable
fun CastCrewSection(
    cast: List<String>?,
    director: List<String>?,
    writer: List<String>?,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        if (!cast.isNullOrEmpty()) {
            CastList(
                title = "Cast",
                names = cast
            )
        }

        if (!director.isNullOrEmpty()) {
            CrewList(
                title = "Director",
                names = director
            )
        }

        if (!writer.isNullOrEmpty()) {
            CrewList(
                title = "Writer",
                names = writer
            )
        }
    }
}

@Composable
fun CastList(
    title: String,
    names: List<String>,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onSurface
        )

        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(names.take(10)) { name ->
                CastCard(name = name)
            }
        }
    }
}

@Composable
fun CrewList(
    title: String,
    names: List<String>,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onSurface
        )

        Text(
            text = names.joinToString(", "),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
fun CastCard(
    name: String,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.width(120.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        // Placeholder for actor image - could be enhanced with actual images
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(160.dp)
                .background(
                    color = MaterialTheme.colorScheme.surfaceVariant,
                    shape = RoundedCornerShape(8.dp)
                )
        )

        Text(
            text = name,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurface,
            maxLines = 2
        )
    }
}
