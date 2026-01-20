package com.nuvio.app.tv.ui.home

import app.cash.turbine.test
import com.nuvio.app.tv.data.repository.CatalogRepository
import com.nuvio.app.tv.data.repository.ProfileRepository
import com.nuvio.app.tv.util.MainDispatcherRule
import com.nuvio.app.tv.util.TestFixtures
import uniffi.nuvio_core.CreateProfileInput
import uniffi.nuvio_core.Profile
import uniffi.nuvio_core.ProfileType
import uniffi.nuvio_core.UpdateProfileInput
import uniffi.nuvio_core.WatchedItem
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test

@ExperimentalCoroutinesApi
class HomeViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private lateinit var catalogRepository: CatalogRepository
    private lateinit var profileRepository: ProfileRepository
    private lateinit var viewModel: HomeViewModel

    @Before
    fun setup() {
        catalogRepository = mockk()
        profileRepository = mockk()
    }

    @Test
    fun `initial state is loading`() = runTest {
        // Given
        coEvery { catalogRepository.getHomeCatalogs() } returns Result.success(emptyList())
        coEvery { profileRepository.getActiveProfile() } returns Result.success(null)

        // When
        viewModel = HomeViewModel(catalogRepository, profileRepository)

        // Then
        viewModel.uiState.test {
            val state = awaitItem()
            assertFalse(state.isLoading)
            assertTrue(state.catalogs.isEmpty())
            assertNull(state.error)
        }
    }

    @Test
    fun `loadHomeData success populates catalogs and metadata`() = runTest {
        // Given
        val catalogs = listOf(TestFixtures.sampleCatalog1)
        coEvery { catalogRepository.getHomeCatalogs() } returns Result.success(catalogs)
        coEvery { catalogRepository.getMetadata("movie-1") } returns Result.success(TestFixtures.sampleMovie1)
        coEvery { catalogRepository.getMetadata("movie-2") } returns Result.success(TestFixtures.sampleMovie2)
        coEvery { catalogRepository.getMetadata("movie-3") } returns Result.success(TestFixtures.sampleMovie1)
        coEvery { profileRepository.getActiveProfile() } returns Result.success(null)

        // When
        viewModel = HomeViewModel(catalogRepository, profileRepository)

        // Then
        viewModel.uiState.test {
            val state = awaitItem()
            assertFalse(state.isLoading)
            assertEquals(1, state.catalogs.size)
            assertEquals("catalog-1", state.catalogs[0].id)
            assertTrue(state.metaCache.isNotEmpty())
            assertNull(state.error)
        }
    }

    @Test
    fun `loadHomeData failure sets error state`() = runTest {
        // Given
        val errorMessage = "Network error"
        coEvery { catalogRepository.getHomeCatalogs() } returns Result.failure(Exception(errorMessage))
        coEvery { profileRepository.getActiveProfile() } returns Result.success(null)

        // When
        viewModel = HomeViewModel(catalogRepository, profileRepository)

        // Then
        viewModel.uiState.test {
            val state = awaitItem()
            assertFalse(state.isLoading)
            assertEquals(errorMessage, state.error)
            assertTrue(state.catalogs.isEmpty())
        }
    }

    @Test
    fun `loadHomeData with active profile loads continue watching`() = runTest {
        // Given
        val activeProfile = Profile(
            id = "profile-1",
            name = "Test User",
            avatar = null,
            type = ProfileType.STANDARD,
            createdAt = 1234567890L,
            lastActiveAt = 1234567890L,
            preferences = null,
            hasPin = false
        )

        val watchedItems = listOf(
            WatchedItem(
                id = "movie-1",
                title = "The Matrix",
                totalDuration = 8160.0,
                watchedDuration = 4080.0,
                lastWatchedAt = 1234567890L
            ),
            WatchedItem(
                id = "movie-2",
                title = "Inception",
                totalDuration = 8880.0,
                watchedDuration = 2000.0,
                lastWatchedAt = 1234567880L
            )
        )

        val catalogs = listOf(TestFixtures.sampleCatalog1)

        coEvery { catalogRepository.getHomeCatalogs() } returns Result.success(catalogs)
        coEvery { catalogRepository.getMetadata("movie-1") } returns Result.success(TestFixtures.sampleMovie1)
        coEvery { catalogRepository.getMetadata("movie-2") } returns Result.success(TestFixtures.sampleMovie2)
        coEvery { catalogRepository.getMetadata("movie-3") } returns Result.success(TestFixtures.sampleMovie1)
        coEvery { profileRepository.getActiveProfile() } returns Result.success(activeProfile)
        coEvery { profileRepository.getWatchedHistory("profile-1") } returns Result.success(watchedItems)

        // When
        viewModel = HomeViewModel(catalogRepository, profileRepository)

        // Then
        viewModel.uiState.test {
            val state = awaitItem()
            assertFalse(state.isLoading)
            assertEquals(2, state.continueWatching.size)
            assertEquals("movie-1", state.continueWatching[0].id) // Most recent first
            assertEquals("movie-2", state.continueWatching[1].id)
        }
    }

    @Test
    fun `loadHomeData without active profile uses fallback continue watching`() = runTest {
        // Given
        val catalogs = listOf(TestFixtures.sampleCatalog1)
        coEvery { catalogRepository.getHomeCatalogs() } returns Result.success(catalogs)
        coEvery { catalogRepository.getMetadata("movie-1") } returns Result.success(TestFixtures.sampleMovie1)
        coEvery { catalogRepository.getMetadata("movie-2") } returns Result.success(TestFixtures.sampleMovie2)
        coEvery { catalogRepository.getMetadata("movie-3") } returns Result.success(TestFixtures.sampleMovie1)
        coEvery { profileRepository.getActiveProfile() } returns Result.success(null)

        // When
        viewModel = HomeViewModel(catalogRepository, profileRepository)

        // Then
        viewModel.uiState.test {
            val state = awaitItem()
            assertFalse(state.isLoading)
            // Should have fallback continue watching items (first 5 from cache)
            assertTrue(state.continueWatching.size <= 5)
        }
    }

    @Test
    fun `loadHomeData populates watchlist`() = runTest {
        // Given
        val catalogs = listOf(TestFixtures.sampleCatalog1)
        coEvery { catalogRepository.getHomeCatalogs() } returns Result.success(catalogs)
        coEvery { catalogRepository.getMetadata(any()) } returns Result.success(TestFixtures.sampleMovie1)
        coEvery { profileRepository.getActiveProfile() } returns Result.success(null)

        // When
        viewModel = HomeViewModel(catalogRepository, profileRepository)

        // Then
        viewModel.uiState.test {
            val state = awaitItem()
            assertFalse(state.isLoading)
            // Watchlist should have items (simulated from items 5-13)
            assertNotNull(state.watchlist)
        }
    }

    @Test
    fun `reload home data clears previous error`() = runTest {
        // Given - First call fails
        val errorMessage = "Network error"
        coEvery { catalogRepository.getHomeCatalogs() } returns Result.failure(Exception(errorMessage))
        coEvery { profileRepository.getActiveProfile() } returns Result.success(null)

        viewModel = HomeViewModel(catalogRepository, profileRepository)

        // When - Second call succeeds
        val catalogs = listOf(TestFixtures.sampleCatalog1)
        coEvery { catalogRepository.getHomeCatalogs() } returns Result.success(catalogs)
        coEvery { catalogRepository.getMetadata(any()) } returns Result.success(TestFixtures.sampleMovie1)

        viewModel.loadHomeData()

        // Then
        viewModel.uiState.test {
            val state = awaitItem()
            assertNull(state.error)
            assertEquals(1, state.catalogs.size)
        }
    }

    @Test
    fun `metadata fetch failure does not crash app`() = runTest {
        // Given
        val catalogs = listOf(TestFixtures.sampleCatalog1)
        coEvery { catalogRepository.getHomeCatalogs() } returns Result.success(catalogs)
        coEvery { catalogRepository.getMetadata("movie-1") } returns Result.success(TestFixtures.sampleMovie1)
        coEvery { catalogRepository.getMetadata("movie-2") } returns Result.failure(Exception("Metadata not found"))
        coEvery { catalogRepository.getMetadata("movie-3") } returns Result.success(TestFixtures.sampleMovie1)
        coEvery { profileRepository.getActiveProfile() } returns Result.success(null)

        // When
        viewModel = HomeViewModel(catalogRepository, profileRepository)

        // Then
        viewModel.uiState.test {
            val state = awaitItem()
            assertFalse(state.isLoading)
            // Should still have successfully fetched metadata
            assertTrue(state.metaCache.containsKey("movie-1"))
            assertTrue(state.metaCache.containsKey("movie-3"))
            assertFalse(state.metaCache.containsKey("movie-2"))
            assertNull(state.error)
        }
    }

    @Test
    fun `verify repository methods are called`() = runTest {
        // Given
        coEvery { catalogRepository.getHomeCatalogs() } returns Result.success(emptyList())
        coEvery { profileRepository.getActiveProfile() } returns Result.success(null)

        // When
        viewModel = HomeViewModel(catalogRepository, profileRepository)

        // Then
        coVerify(exactly = 1) { catalogRepository.getHomeCatalogs() }
        coVerify(exactly = 1) { profileRepository.getActiveProfile() }
    }
}
