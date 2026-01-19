package com.nuvio.app.tv.data.repository


interface CatalogRepository {
    suspend fun getHomeCatalogs(): Result<List<Catalog>>
    suspend fun getMetadata(id: String): Result<Meta>
    suspend fun getStreams(id: String, type: String): Result<List<Stream>>
    suspend fun search(query: String): Result<List<Meta>>

    // Catalog browsing with pagination and filters
    suspend fun browseCatalog(
        contentType: String,
        catalogId: String,
        page: Int,
        genre: String? = null,
        year: Int? = null,
        sort: String? = null
    ): Result<CatalogPage>

    // Get available genres for content type
    suspend fun getGenres(contentType: String): Result<List<String>>
}
