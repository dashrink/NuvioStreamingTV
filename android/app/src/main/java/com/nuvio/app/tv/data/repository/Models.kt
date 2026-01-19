package com.nuvio.app.tv.data.repository

data class Catalog(
    val id: String,
    val name: String,
    val description: String,
    val itemIds: List<String>
)

data class Meta(
    val id: String,
    val name: String,
    val description: String?,
    val posterUrl: String?,
    val backgroundUrl: String?,
    val logoUrl: String?,
    val imdbId: String?,
    val tmdbId: Int?,
    val type: String,
    val year: Int? = null,
    val genres: List<String>? = null,
    val rating: Double? = null,
    val releaseInfo: String? = null,
    val runtime: String? = null,
    val cast: List<String>? = null,
    val director: List<String>? = null,
    val writer: List<String>? = null,
    val certification: String? = null,
    val country: String? = null,
    val released: String? = null
)

data class Stream(
    val url: String?,
    val name: String?,
    val description: String?,
    val addonName: String?
)

data class CatalogPage(
    val items: List<Meta>,
    val hasMore: Boolean,
    val page: Int
)
