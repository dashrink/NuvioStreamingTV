package com.nuvio.app.tv.data.repository

import com.nuvio.sdk.core.StremioMeta
import com.nuvio.sdk.core.StremioService
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RustCatalogRepository @Inject constructor(
    private val service: StremioService
) : CatalogRepository {

    private val metaCache = mutableMapOf<String, StremioMeta>()
    
    // Cinemeta is the default addon for metadata
    private val cinemetaUrl = "https://v3-cinemeta.strem.io/manifest.json"
    private val cinemetaId = "com.linvo.cinemeta"

    private suspend fun ensureCinemeta() {
        val addons = service.getAddons()
        if (addons.none { it.id == cinemetaId }) {
            try {
                service.discover(cinemetaUrl)
            } catch (e: Exception) {
                // Log or handle error, but continue if possible (maybe caching helps?)
                e.printStackTrace()
            }
        }
    }

    override suspend fun getHomeCatalogs(): Result<List<Catalog>> = runCatching {
        ensureCinemeta()
        
        val catalogs = mutableListOf<Catalog>()
        
        // 1. Trending Movies
        val trendingMovies = service.getCatalog(cinemetaId, "movie", "top", 1u, null)
        cacheMetas(trendingMovies)
        catalogs.add(
            Catalog(
                id = "trending_movies",
                name = "Trending Movies",
                description = "Popular movies right now",
                itemIds = trendingMovies.map { it.id }
            )
        )
        
        // 2. Trending Series
        val trendingSeries = service.getCatalog(cinemetaId, "series", "top", 1u, null)
        cacheMetas(trendingSeries)
        catalogs.add(
            Catalog(
                id = "trending_series",
                name = "Trending Series",
                description = "Popular series right now",
                itemIds = trendingSeries.map { it.id }
            )
        )

        catalogs
    }

    override suspend fun getMetadata(id: String): Result<Meta> = runCatching {
        // Check cache first
        val cached = metaCache[id]
        if (cached != null) {
            return@runCatching mapToMeta(cached)
        }

        ensureCinemeta()
        // Determine type from ID or just try both? 
        // Cinemeta usually supports resolving by ID regardless of type in aggregate_meta (if improved)
        // But the API requires contentType.
        // Guessing type: tt* usually movie or series.
        // We'll try "movie" first, then "series" if null, or assume it based on something else?
        // Actually, aggregateMeta takes (contentType, contentId).
        
        // Optimization: In real app, we'd know the type from the catalog item.
        // For now, let's try movie first.
        var meta = service.aggregateMeta("movie", id)
        if (meta == null) {
            meta = service.aggregateMeta("series", id)
        }
        
        if (meta != null) {
            metaCache[id] = meta
            mapToMeta(meta)
        } else {
            throw Exception("Metadata not found for id: $id")
        }
    }

    override suspend fun search(query: String): Result<List<Meta>> = runCatching {
        ensureCinemeta()
        
        // Search movies and series
        val movieResults = try {
            service.getCatalog(cinemetaId, "movie", "top", 1u, query)
        } catch (e: Exception) {
            emptyList()
        }
        
        val seriesResults = try {
            service.getCatalog(cinemetaId, "series", "top", 1u, query)
        } catch (e: Exception) {
            emptyList()
        }

        val allResults = movieResults + seriesResults
        
        if (allResults.isEmpty() && query.isNotEmpty()) {
             // Fallback or retry logic could go here
        }
        
        cacheMetas(allResults)
        
        allResults.map { mapToMeta(it) }
    }

    override suspend fun getStreams(id: String, type: String): Result<List<Stream>> = runCatching {
        val stremioStreams = service.resolveStreams(type, id)
        stremioStreams.map {
             Stream(
                 url = it.url,
                 name = it.name ?: it.title,
                 description = it.description,
                 addonName = it.addonName
             )
        }
    }
    
    private fun cacheMetas(metas: List<StremioMeta>) {
        metas.forEach { metaCache[it.id] = it }
    }
    
    private fun mapToMeta(stremioMeta: StremioMeta): Meta {
        return Meta(
            id = stremioMeta.id,
            name = stremioMeta.name,
            description = stremioMeta.description,
            posterUrl = stremioMeta.poster,
            backgroundUrl = stremioMeta.background,
            logoUrl = stremioMeta.logo,
            imdbId = stremioMeta.imdbId,
            tmdbId = null, // TODO: Extract from behaviorHints or similar if needed
            type = stremioMeta.contentType,
            year = stremioMeta.year,
            genres = stremioMeta.genres,
            rating = stremioMeta.imdbRating?.toDoubleOrNull(),
            releaseInfo = stremioMeta.releaseInfo,
            runtime = stremioMeta.runtime,
            cast = stremioMeta.cast,
            director = stremioMeta.director,
            writer = stremioMeta.writer,
            certification = stremioMeta.certification,
            country = stremioMeta.country,
            released = stremioMeta.released
        )
    }

    override suspend fun browseCatalog(
        contentType: String,
        catalogId: String,
        page: Int,
        genre: String?,
        year: Int?,
        sort: String?
    ): Result<CatalogPage> = runCatching {
        ensureCinemeta()

        // Build catalog ID with genre if specified
        val fullCatalogId = if (genre != null) {
            "genre.$genre"
        } else {
            catalogId
        }

        // Get catalog from service (page is 1-indexed)
        val metas = service.getCatalog(
            cinemetaId,
            contentType,
            fullCatalogId,
            page.toUInt(),
            null
        )

        // Cache the metas
        cacheMetas(metas)

        // Filter by year if specified
        val filteredMetas = if (year != null) {
            metas.filter { it.year == year.toString() }
        } else {
            metas
        }

        // Map to Meta objects
        val items = filteredMetas.map { mapToMeta(it) }

        // Stremio typically returns 20 items per page
        // If we got fewer than 20, there are no more pages
        val hasMore = metas.size >= 20

        CatalogPage(
            items = items,
            hasMore = hasMore,
            page = page
        )
    }

    override suspend fun getGenres(contentType: String): Result<List<String>> = runCatching {
        // Common genres for movies and series
        // These align with Cinemeta's genre catalogs
        listOf(
            "action",
            "adventure",
            "animation",
            "biography",
            "comedy",
            "crime",
            "documentary",
            "drama",
            "family",
            "fantasy",
            "film-noir",
            "history",
            "horror",
            "music",
            "musical",
            "mystery",
            "romance",
            "sci-fi",
            "sport",
            "thriller",
            "war",
            "western"
        )
    }
}
