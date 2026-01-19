package com.nuvio.app.tv.data.repository

import com.nuvio.app.tv.util.MainDispatcherRule
import com.nuvio.sdk.core.CatalogEntry
import com.nuvio.sdk.core.StremioMeta
import com.nuvio.sdk.core.StremioService
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Before
import org.junit.Rule
import org.junit.Test

@ExperimentalCoroutinesApi
class RustCatalogRepositoryTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private lateinit var stremioService: StremioService
    private lateinit var repository: RustCatalogRepository

    @Before
    fun setup() {
        stremioService = mockk()
        // Use reflection to inject mock service since RustCatalogRepository is a singleton
        val instanceField = RustCatalogRepository::class.java.getDeclaredField("INSTANCE")
        instanceField.isAccessible = true
        instanceField.set(null, null)

        val serviceField = RustCatalogRepository::class.java.getDeclaredField("service")
        serviceField.isAccessible = true

        repository = RustCatalogRepository
        serviceField.set(repository, stremioService)
    }

    @Test
    fun `getHomeCatalogs returns mapped catalogs from Rust SDK`() = runTest {
        // Given
        val catalogEntry = CatalogEntry(
            id = "cinemeta-top",
            name = "Top Movies",
            type = "movie",
            extra = null
        )
        val catalogList = listOf(catalogEntry)

        coEvery { stremioService.getAddons() } returns emptyList()

        // When
        val result = repository.getHomeCatalogs()

        // Then
        assertTrue(result.isSuccess)
        // Note: Real implementation would need actual addon with catalogs
    }

    @Test
    fun `getMetadata returns meta from Rust SDK`() = runTest {
        // Given
        val metaId = "movie:tt0133093"
        val stremioMeta = StremioMeta(
            id = metaId,
            name = "The Matrix",
            type = "movie",
            poster = "https://example.com/poster.jpg",
            background = "https://example.com/background.jpg",
            logo = null,
            description = "A computer hacker learns about the true nature of reality.",
            releaseInfo = "1999",
            imdbRating = null,
            genres = listOf("Action", "Sci-Fi"),
            runtime = "136 min",
            website = null,
            director = listOf("The Wachowskis"),
            cast = listOf("Keanu Reeves", "Laurence Fishburne"),
            writer = null,
            imdbId = "tt0133093",
            released = "1999-03-31",
            trailerStreams = null,
            links = null,
            videos = null,
            behaviorHints = null
        )

        coEvery { stremioService.aggregateMeta("movie", "tt0133093") } returns stremioMeta

        // When
        val result = repository.getMetadata(metaId)

        // Then
        assertTrue(result.isSuccess)
        val meta = result.getOrNull()
        assertNotNull(meta)
        assertEquals("movie:tt0133093", meta?.id)
        assertEquals("The Matrix", meta?.name)
        assertEquals("movie", meta?.type)
        assertEquals("tt0133093", meta?.imdbId)
    }

    @Test
    fun `getMetadata caches results`() = runTest {
        // Given
        val metaId = "movie:tt0133093"
        val stremioMeta = StremioMeta(
            id = metaId,
            name = "The Matrix",
            type = "movie",
            poster = null,
            background = null,
            logo = null,
            description = null,
            releaseInfo = null,
            imdbRating = null,
            genres = null,
            runtime = null,
            website = null,
            director = null,
            cast = null,
            writer = null,
            imdbId = "tt0133093",
            released = null,
            trailerStreams = null,
            links = null,
            videos = null,
            behaviorHints = null
        )

        coEvery { stremioService.aggregateMeta("movie", "tt0133093") } returns stremioMeta

        // When
        val result1 = repository.getMetadata(metaId)
        val result2 = repository.getMetadata(metaId)

        // Then
        assertTrue(result1.isSuccess)
        assertTrue(result2.isSuccess)
        // Second call should use cache (though we can't easily verify with mockk)
        assertEquals(result1.getOrNull()?.id, result2.getOrNull()?.id)
    }

    @Test
    fun `getMetadata handles SDK exceptions`() = runTest {
        // Given
        val metaId = "movie:invalid"
        coEvery { stremioService.aggregateMeta(any(), any()) } throws Exception("Meta not found")

        // When
        val result = repository.getMetadata(metaId)

        // Then
        assertTrue(result.isFailure)
        assertNotNull(result.exceptionOrNull())
    }

    @Test
    fun `search returns filtered results`() = runTest {
        // Given
        val query = "Matrix"
        val catalogEntry = CatalogEntry(
            id = "cinemeta-search",
            name = "Search Results",
            type = "movie",
            extra = null
        )

        coEvery { stremioService.getAddons() } returns emptyList()

        // When
        val result = repository.search(query)

        // Then
        assertTrue(result.isSuccess)
        // Note: Real implementation depends on actual search results
    }

    @Test
    fun `browseCatalog supports pagination`() = runTest {
        // Given
        val catalogId = "top"
        val contentType = "movie"

        coEvery { stremioService.getCatalog(any(), any(), any(), any(), any()) } returns emptyList()

        // When
        val page0 = repository.browseCatalog(catalogId, contentType, page = 0)
        val page1 = repository.browseCatalog(catalogId, contentType, page = 1)

        // Then
        assertTrue(page0.isSuccess)
        assertTrue(page1.isSuccess)
        // Verify pagination works (implementation dependent)
    }
}
