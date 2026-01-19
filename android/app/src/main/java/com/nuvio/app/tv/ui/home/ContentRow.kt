package com.nuvio.app.tv.ui.home

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.nuvio.app.tv.data.repository.Meta
import com.nuvio.app.tv.ui.components.PosterCard
import com.nuvio.app.tv.ui.theme.isTv
import kotlinx.coroutines.launch

@Composable
fun ContentRow(
    title: String,
    items: List<Meta>,
    onItemClick: (Meta) -> Unit,
    modifier: Modifier = Modifier,
    requestFocusOnFirstItem: Boolean = false
) {
    val isTV = isTv()
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()
    val firstItemFocusRequester = remember { FocusRequester() }

    Column(modifier = modifier.padding(top = 24.dp)) {
        Text(
            text = title,
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onBackground,
            modifier = Modifier.padding(horizontal = if (isTV) 48.dp else 16.dp)
        )

        Spacer(modifier = Modifier.height(12.dp))

        LazyRow(
            state = listState,
            contentPadding = PaddingValues(horizontal = if (isTV) 40.dp else 16.dp),
            horizontalArrangement = Arrangement.spacedBy(if (isTV) 16.dp else 12.dp)
        ) {
            items(items, key = { it.id }) { meta ->
                val itemModifier = if (isTV && items.indexOf(meta) == 0 && requestFocusOnFirstItem) {
                    Modifier.focusRequester(firstItemFocusRequester)
                } else {
                    Modifier
                }

                PosterCard(
                    meta = meta,
                    onClick = { onItemClick(meta) },
                    modifier = itemModifier
                )
            }
        }

        // Request focus on first item if needed (TV only)
        if (isTV && requestFocusOnFirstItem && items.isNotEmpty()) {
            LaunchedEffect(Unit) {
                firstItemFocusRequester.requestFocus()
            }
        }
    }
}
