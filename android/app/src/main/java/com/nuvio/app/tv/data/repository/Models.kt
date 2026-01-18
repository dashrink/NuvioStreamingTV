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
    val imdbId: String?,
    val tmdbId: Int?,
    val type: String
)

data class Stream(
    val url: String?,
    val name: String?,
    val description: String?,
    val addonName: String?
)
