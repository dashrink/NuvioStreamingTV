package com.nuvio.app.tv.util

import com.nuvio.app.tv.data.repository.Catalog
import com.nuvio.app.tv.data.repository.CatalogPage
import com.nuvio.app.tv.data.repository.Meta
import com.nuvio.app.tv.data.repository.Stream

/**
 * Test fixtures for unit and integration testing
 */
object TestFixtures {

    // Sample Catalogs
    val sampleCatalog1 = Catalog(
        id = "catalog-1",
        name = "Popular Movies",
        description = "Most popular movies right now",
        itemIds = listOf("movie-1", "movie-2", "movie-3")
    )

    val sampleCatalog2 = Catalog(
        id = "catalog-2",
        name = "Top TV Shows",
        description = "Trending TV shows",
        itemIds = listOf("series-1", "series-2")
    )

    // Sample Meta items
    val sampleMovie1 = Meta(
        id = "movie-1",
        name = "The Matrix",
        description = "A computer hacker learns from mysterious rebels about the true nature of his reality.",
        posterUrl = "https://example.com/posters/matrix.jpg",
        backgroundUrl = "https://example.com/backgrounds/matrix.jpg",
        logoUrl = "https://example.com/logos/matrix.png",
        imdbId = "tt0133093",
        tmdbId = 603,
        type = "movie",
        year = 1999,
        genres = listOf("Action", "Sci-Fi"),
        rating = 8.7,
        releaseInfo = "1999-03-31",
        runtime = "136 min",
        cast = listOf("Keanu Reeves", "Laurence Fishburne", "Carrie-Anne Moss"),
        director = listOf("Lana Wachowski", "Lilly Wachowski"),
        writer = listOf("Lana Wachowski", "Lilly Wachowski"),
        certification = "R",
        country = "USA",
        released = "1999-03-31"
    )

    val sampleMovie2 = Meta(
        id = "movie-2",
        name = "Inception",
        description = "A thief who steals corporate secrets through dream-sharing technology.",
        posterUrl = "https://example.com/posters/inception.jpg",
        backgroundUrl = "https://example.com/backgrounds/inception.jpg",
        logoUrl = null,
        imdbId = "tt1375666",
        tmdbId = 27205,
        type = "movie",
        year = 2010,
        genres = listOf("Action", "Sci-Fi", "Thriller"),
        rating = 8.8,
        releaseInfo = "2010-07-16",
        runtime = "148 min",
        cast = listOf("Leonardo DiCaprio", "Joseph Gordon-Levitt", "Elliot Page"),
        director = listOf("Christopher Nolan"),
        writer = listOf("Christopher Nolan"),
        certification = "PG-13",
        country = "USA",
        released = "2010-07-16"
    )

    val sampleSeries1 = Meta(
        id = "series-1",
        name = "Breaking Bad",
        description = "A high school chemistry teacher turned methamphetamine producer.",
        posterUrl = "https://example.com/posters/breaking-bad.jpg",
        backgroundUrl = "https://example.com/backgrounds/breaking-bad.jpg",
        logoUrl = "https://example.com/logos/breaking-bad.png",
        imdbId = "tt0903747",
        tmdbId = 1396,
        type = "series",
        year = 2008,
        genres = listOf("Crime", "Drama", "Thriller"),
        rating = 9.5,
        releaseInfo = "2008-01-20",
        runtime = "49 min",
        cast = listOf("Bryan Cranston", "Aaron Paul", "Anna Gunn"),
        director = listOf("Vince Gilligan"),
        writer = listOf("Vince Gilligan"),
        certification = "TV-MA",
        country = "USA",
        released = "2008-01-20"
    )

    val sampleSeries2 = Meta(
        id = "series-2",
        name = "Stranger Things",
        description = "A group of kids investigate supernatural events in their town.",
        posterUrl = "https://example.com/posters/stranger-things.jpg",
        backgroundUrl = null,
        logoUrl = null,
        imdbId = "tt4574334",
        tmdbId = 66732,
        type = "series",
        year = 2016,
        genres = listOf("Drama", "Fantasy", "Horror"),
        rating = 8.7,
        releaseInfo = "2016-07-15",
        runtime = "51 min",
        cast = listOf("Millie Bobby Brown", "Finn Wolfhard", "Winona Ryder"),
        director = listOf("The Duffer Brothers"),
        writer = listOf("The Duffer Brothers"),
        certification = "TV-14",
        country = "USA",
        released = "2016-07-15"
    )

    // Sample Streams
    val sampleStream1 = Stream(
        url = "https://example.com/streams/movie-1-1080p.m3u8",
        name = "1080p",
        description = "Full HD stream",
        addonName = "Torrentio"
    )

    val sampleStream2 = Stream(
        url = "https://example.com/streams/movie-1-720p.m3u8",
        name = "720p",
        description = "HD stream",
        addonName = "Torrentio"
    )

    val sampleStream3 = Stream(
        url = "https://example.com/streams/movie-1-4k.m3u8",
        name = "4K",
        description = "Ultra HD stream",
        addonName = "Torrentio"
    )

    // Sample CatalogPages
    val sampleCatalogPage1 = CatalogPage(
        items = listOf(sampleMovie1, sampleMovie2),
        hasMore = true,
        page = 0
    )

    val sampleCatalogPage2 = CatalogPage(
        items = listOf(sampleSeries1, sampleSeries2),
        hasMore = false,
        page = 1
    )

    val emptyCatalogPage = CatalogPage(
        items = emptyList(),
        hasMore = false,
        page = 0
    )

    // Helper functions
    fun createMeta(
        id: String = "test-id",
        name: String = "Test Movie",
        type: String = "movie",
        year: Int? = 2023,
        rating: Double? = 7.5
    ): Meta = Meta(
        id = id,
        name = name,
        description = "Test description",
        posterUrl = "https://example.com/poster.jpg",
        backgroundUrl = null,
        logoUrl = null,
        imdbId = null,
        tmdbId = null,
        type = type,
        year = year,
        genres = listOf("Drama"),
        rating = rating,
        releaseInfo = null,
        runtime = null,
        cast = null,
        director = null,
        writer = null,
        certification = null,
        country = null,
        released = null
    )

    fun createCatalog(
        id: String = "test-catalog",
        name: String = "Test Catalog",
        itemIds: List<String> = listOf("1", "2", "3")
    ): Catalog = Catalog(
        id = id,
        name = name,
        description = "Test catalog description",
        itemIds = itemIds
    )

    fun createStream(
        url: String = "https://example.com/stream.m3u8",
        name: String = "Test Stream",
        description: String = "Test stream description",
        addonName: String = "Test Addon"
    ): Stream = Stream(
        url = url,
        name = name,
        description = description,
        addonName = addonName
    )

    fun createCatalogPage(
        items: List<Meta> = listOf(sampleMovie1),
        hasMore: Boolean = false,
        page: Int = 0
    ): CatalogPage = CatalogPage(
        items = items,
        hasMore = hasMore,
        page = page
    )
}
