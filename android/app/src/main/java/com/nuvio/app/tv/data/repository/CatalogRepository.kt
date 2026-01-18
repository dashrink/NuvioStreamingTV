package com.nuvio.app.tv.data.repository


interface CatalogRepository {
    suspend fun getHomeCatalogs(): Result<List<Catalog>>
    suspend fun getMetadata(id: String): Result<Meta>
    suspend fun getStreams(id: String, type: String): Result<List<Stream>>
    suspend fun search(query: String): Result<List<Meta>>
}
