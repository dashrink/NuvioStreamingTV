package com.nuvio.app.tv.data.repository

import kotlinx.coroutines.delay
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class MockCatalogRepository @Inject constructor() : CatalogRepository {

    private val mockMetas = listOf(
        Meta(
            id = "1",
            name = "The Matrix",
            description = "A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.",
            posterUrl = "https://image.tmdb.org/t/p/w500/f89U3Y9L9uwpXec9yvXpZQK13h.jpg",
            backgroundUrl = "https://image.tmdb.org/t/p/original/dXNAPw34MIn7p9uGfPaIhpj7uXX.jpg",
            imdbId = "tt0133093",
            tmdbId = 603,
            type = "movie"
        ),
        Meta(
            id = "2",
            name = "Inception",
            description = "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
            posterUrl = "https://image.tmdb.org/t/p/w500/ljsZTbVjYfwzHTpZslS36vSwmkm.jpg",
            backgroundUrl = "https://image.tmdb.org/t/p/original/s3TmtjS7UKEu0ZAmSve4Standard.jpg",
            imdbId = "tt1375666",
            tmdbId = 27205,
            type = "movie"
        ),
        Meta(
            id = "3",
            name = "Interstellar",
            description = "When Earth becomes uninhabitable in the future, a farmer and ex-NASA pilot, Joseph Cooper, is tasked to pilot a spacecraft, along with a team of researchers, to find a new planet for humans.",
            posterUrl = "https://image.tmdb.org/t/p/w500/gEU2QniE6EwfVnz6z2YbpjciZoa.jpg",
            backgroundUrl = "https://image.tmdb.org/t/p/original/rAiY_pUm6vCWSbah1096stSGaFL.jpg",
            imdbId = "tt0816692",
            tmdbId = 157336,
            type = "movie"
        )
    )

    override suspend fun getHomeCatalogs(): Result<List<Catalog>> {
        delay(1000) // Simulate network
        return Result.success(
            listOf(
                Catalog(
                    id = "trending",
                    name = "Trending Now",
                    description = "Popular content this week",
                    itemIds = mockMetas.map { it.id }
                ),
                Catalog(
                    id = "scifi",
                    name = "Sci-Fi Greats",
                    description = "Top rated science fiction",
                    itemIds = mockMetas.reversed().map { it.id }
                )
            )
        )
    }

    override suspend fun getMetadata(id: String): Result<Meta> {
        delay(300)
        val meta = mockMetas.find { it.id == id }
        return if (meta != null) Result.success(meta) else Result.failure(Exception("Not found"))
    }

    override suspend fun getStreams(id: String, type: String): Result<List<Stream>> {
        delay(500)
        return Result.success(
            listOf(
                Stream(
                    url = "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
                    name = "1080p - Mock Stream",
                    description = "Mock stream for testing",
                    addonName = "Mock Addon"
                )
            )
        )
    }

    override suspend fun search(query: String): Result<List<Meta>> {
        delay(500)
        return Result.success(mockMetas.filter { it.name.contains(query, ignoreCase = true) })
    }
}
