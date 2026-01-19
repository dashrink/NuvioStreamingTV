package com.nuvio.app.tv.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.nuvio.app.tv.data.repository.Meta

@Composable
fun MetadataInfo(
    meta: Meta,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Title
        Text(
            text = meta.name,
            style = MaterialTheme.typography.displayMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )

        // Info row: Year, Runtime, Certification, Rating
        Row(
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            meta.year?.let { year ->
                Text(
                    text = year.toString(),
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            meta.runtime?.let { runtime ->
                Text(
                    text = runtime,
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            meta.certification?.let { cert ->
                CertificationBadge(certification = cert)
            }

            meta.rating?.let { rating ->
                RatingBadge(rating = rating)
            }
        }

        // Genres
        if (!meta.genres.isNullOrEmpty()) {
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(meta.genres) { genre ->
                    GenreChip(genre = genre)
                }
            }
        }

        // Description
        meta.description?.let { description ->
            Text(
                text = description,
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                lineHeight = MaterialTheme.typography.bodyLarge.lineHeight
            )
        }

        // Additional info
        Column(
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            meta.country?.let { country ->
                InfoRow(label = "Country", value = country)
            }

            meta.releaseInfo?.let { releaseInfo ->
                InfoRow(label = "Release", value = releaseInfo)
            }

            meta.released?.let { released ->
                InfoRow(label = "Released", value = released)
            }
        }
    }
}

@Composable
fun TvMetadataInfo(
    meta: Meta,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(24.dp)
    ) {
        // Title with larger typography for TV
        Text(
            text = meta.name,
            style = MaterialTheme.typography.displayLarge,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )

        // Info row with larger spacing for TV
        Row(
            horizontalArrangement = Arrangement.spacedBy(24.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            meta.year?.let { year ->
                Text(
                    text = year.toString(),
                    style = MaterialTheme.typography.titleLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            meta.runtime?.let { runtime ->
                Text(
                    text = runtime,
                    style = MaterialTheme.typography.titleLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            meta.certification?.let { cert ->
                CertificationBadge(certification = cert)
            }

            meta.rating?.let { rating ->
                RatingBadge(rating = rating)
            }
        }

        // Genres
        if (!meta.genres.isNullOrEmpty()) {
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(meta.genres) { genre ->
                    GenreChip(genre = genre)
                }
            }
        }

        // Description with larger typography for TV
        meta.description?.let { description ->
            Text(
                text = description,
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                lineHeight = MaterialTheme.typography.titleMedium.lineHeight
            )
        }

        // Additional info
        Column(
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            meta.country?.let { country ->
                TvInfoRow(label = "Country", value = country)
            }

            meta.releaseInfo?.let { releaseInfo ->
                TvInfoRow(label = "Release", value = releaseInfo)
            }

            meta.released?.let { released ->
                TvInfoRow(label = "Released", value = released)
            }
        }
    }
}

@Composable
fun InfoRow(
    label: String,
    value: String,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Text(
            text = "$label:",
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onSurface
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
fun TvInfoRow(
    label: String,
    value: String,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text(
            text = "$label:",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onSurface
        )
        Text(
            text = value,
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
fun GenreChip(
    genre: String,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .background(
                color = MaterialTheme.colorScheme.surfaceVariant,
                shape = RoundedCornerShape(16.dp)
            )
            .padding(horizontal = 16.dp, vertical = 8.dp)
    ) {
        Text(
            text = genre.replaceFirstChar { it.uppercase() },
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.onSurface
        )
    }
}
