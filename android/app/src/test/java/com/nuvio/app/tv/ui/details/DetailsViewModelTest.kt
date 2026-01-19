package com.nuvio.app.tv.ui.details

import app.cash.turbine.test
import com.nuvio.app.tv.data.repository.CatalogRepository
import com.nuvio.app.tv.util.MainDispatcherRule
import com.nuvio.app.tv.util.TestFixtures
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Before
import org.junit.Rule
import org.junit.Test

@ExperimentalCoroutinesApi
class DetailsViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private lateinit var repository: CatalogRepository
    private lateinit var viewModel: DetailsViewModel

    @Before
    fun setup() {
        repository = mockk()
        viewModel = DetailsViewModel(repository)
    }

    @Test
    fun `loadDetails success populates meta and streams`() = runTest {
        // Given
        val meta = TestFixtures.sampleMovie1
        val streams = listOf(TestFixtures.sampleStream1, TestFixtures.sampleStream2)

        coEvery { repository.getMetadata("movie-1") } returns Result.success(meta)
        coEvery { repository.getStreams("movie-1", "movie") } returns Result.success(streams)

        // When
        viewModel.loadDetails("movie-1")

        // Then
        viewModel.uiState.test {
            val state = awaitItem()
            assertFalse(state.isLoading)
            assertNotNull(state.meta)
            assertEquals("movie-1", state.meta?.id)
            assertEquals(2, state.streams.size)
            assertNull(state.error)
        }
    }

    @Test
    fun `loadDetails failure sets error state`() = runTest {
        // Given
        val errorMessage = "Content not found"
        coEvery { repository.getMetadata("invalid-id") } returns Result.failure(Exception(errorMessage))

        // When
        viewModel.loadDetails("invalid-id")

        // Then
        viewModel.uiState.test {
            val state = awaitItem()
            assertFalse(state.isLoading)
            assertNull(state.meta)
            assertEquals(errorMessage, state.error)
        }
    }

    @Test
    fun `loadDetails with streams failure does not block meta loading`() = runTest {
        // Given
        val meta = TestFixtures.sampleMovie1
        coEvery { repository.getMetadata("movie-1") } returns Result.success(meta)
        coEvery { repository.getStreams("movie-1", "movie") } returns Result.failure(Exception("Streams not available"))

        // When
        viewModel.loadDetails("movie-1")

        // Then
        viewModel.uiState.test {
            val state = awaitItem()
            assertFalse(state.isLoading)
            assertNotNull(state.meta)
            assertTrue(state.streams.isEmpty()) // Streams should be empty but meta should load
        }
    }

    @Test
    fun `toggleWatchlist changes watchlist state`() = runTest {
        // Given
        coEvery { repository.getMetadata("movie-1") } returns Result.success(TestFixtures.sampleMovie1)
        coEvery { repository.getStreams(any(), any()) } returns Result.success(emptyList())

        viewModel.loadDetails("movie-1")

        // When
        val initialState = viewModel.uiState.value.isInWatchlist
        viewModel.toggleWatchlist()
        val afterFirstToggle = viewModel.uiState.value.isInWatchlist
        viewModel.toggleWatchlist()
        val afterSecondToggle = viewModel.uiState.value.isInWatchlist

        // Then
        assertFalse(initialState)
        assertTrue(afterFirstToggle)
        assertFalse(afterSecondToggle)
    }

    @Test
    fun `rateContent updates user rating`() = runTest {
        // Given
        coEvery { repository.getMetadata("movie-1") } returns Result.success(TestFixtures.sampleMovie1)
        coEvery { repository.getStreams(any(), any()) } returns Result.success(emptyList())

        viewModel.loadDetails("movie-1")

        // When
        viewModel.rateContent(8)

        // Then
        viewModel.uiState.test {
            val state = awaitItem()
            assertEquals(8, state.userRating)
        }
    }

    @Test
    fun `getMeta returns repository result`() = runTest {
        // Given
        val meta = TestFixtures.sampleMovie1
        coEvery { repository.getMetadata("movie-1") } returns Result.success(meta)

        // When
        val result = viewModel.getMeta("movie-1")

        // Then
        assertTrue(result.isSuccess)
        assertEquals(meta, result.getOrNull())
        coVerify(exactly = 1) { repository.getMetadata("movie-1") }
    }

    @Test
    fun `getStreams returns repository result`() = runTest {
        // Given
        val streams = listOf(TestFixtures.sampleStream1)
        coEvery { repository.getStreams("movie-1", "movie") } returns Result.success(streams)

        // When
        val result = viewModel.getStreams("movie-1", "movie")

        // Then
        assertTrue(result.isSuccess)
        assertEquals(streams, result.getOrNull())
        coVerify(exactly = 1) { repository.getStreams("movie-1", "movie") }
    }
}
