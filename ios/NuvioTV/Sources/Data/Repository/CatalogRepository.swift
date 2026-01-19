//
//  CatalogRepository.swift
//  NuvioTV
//
//  Created by Claude Code
//  Repository protocol for catalog operations
//

import Foundation

/// Repository protocol for catalog operations
protocol CatalogRepository {
    /// Get catalogs for home screen
    func getHomeCatalogs() async throws -> [Catalog]

    /// Get metadata for a specific content item
    func getMetadata(id: String) async throws -> Meta

    /// Get available streams for content
    func getStreams(id: String, type: String) async throws -> [Stream]

    /// Search for content
    func search(query: String) async throws -> [Meta]

    /// Browse catalog with pagination and filters
    func browseCatalog(
        contentType: String,
        catalogId: String,
        page: Int,
        genre: String?,
        year: Int?,
        sort: String?
    ) async throws -> CatalogPage

    /// Get available genres for content type
    func getGenres(contentType: String) async throws -> [String]
}

/// Mock implementation for testing without Rust SDK
class MockCatalogRepository: CatalogRepository {

    // Mock data
    private let mockGenres = [
        "action", "adventure", "animation", "biography", "comedy",
        "crime", "documentary", "drama", "family", "fantasy",
        "film-noir", "history", "horror", "music", "musical",
        "mystery", "romance", "sci-fi", "sport", "thriller",
        "war", "western"
    ]

    private func generateMockMeta(id: String, type: String) -> Meta {
        let genres = mockGenres.shuffled().prefix(Int.random(in: 2...4))
        return Meta(
            id: id,
            name: "Sample \(type.capitalized) \(id)",
            description: "This is a sample \(type) with ID \(id). Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
            posterUrl: "https://via.placeholder.com/300x450/1a1a1a/ffffff?text=\(type)+\(id)",
            backgroundUrl: "https://via.placeholder.com/1920x1080/1a1a1a/ffffff?text=BG",
            logoUrl: nil,
            imdbId: "tt\(String(format: "%07d", Int.random(in: 1...9999999)))",
            tmdbId: Int.random(in: 1...999999),
            type: type,
            year: Int.random(in: 2010...2024),
            genres: Array(genres),
            rating: Double.random(in: 6.0...9.5),
            releaseInfo: nil,
            runtime: "\(Int.random(in: 90...180)) min",
            cast: ["Actor 1", "Actor 2", "Actor 3"],
            director: ["Director Name"],
            writer: ["Writer Name"],
            certification: "PG-13",
            country: "USA",
            released: nil
        )
    }

    func getHomeCatalogs() async throws -> [Catalog] {
        // Simulate network delay
        try await Task.sleep(nanoseconds: 500_000_000) // 0.5 seconds

        return [
            Catalog(
                id: "trending_movies",
                name: "Trending Movies",
                description: "Popular movies right now",
                itemIds: (1...20).map { "movie_\($0)" }
            ),
            Catalog(
                id: "trending_series",
                name: "Trending Series",
                description: "Popular series right now",
                itemIds: (1...20).map { "series_\($0)" }
            )
        ]
    }

    func getMetadata(id: String) async throws -> Meta {
        // Simulate network delay
        try await Task.sleep(nanoseconds: 300_000_000) // 0.3 seconds

        let type = id.hasPrefix("movie") ? "movie" : "series"
        return generateMockMeta(id: id, type: type)
    }

    func getStreams(id: String, type: String) async throws -> [Stream] {
        // Simulate network delay
        try await Task.sleep(nanoseconds: 500_000_000) // 0.5 seconds

        return [
            Stream(
                url: "https://example.com/stream1.m3u8",
                name: "HD Stream",
                description: "1080p",
                addonName: "Sample Addon"
            ),
            Stream(
                url: "https://example.com/stream2.m3u8",
                name: "4K Stream",
                description: "2160p",
                addonName: "Sample Addon"
            )
        ]
    }

    func search(query: String) async throws -> [Meta] {
        // Simulate network delay
        try await Task.sleep(nanoseconds: 400_000_000) // 0.4 seconds

        guard !query.isEmpty else { return [] }

        // Return mock search results
        let movieResults = (1...5).map { generateMockMeta(id: "search_movie_\($0)", type: "movie") }
        let seriesResults = (1...5).map { generateMockMeta(id: "search_series_\($0)", type: "series") }

        return movieResults + seriesResults
    }

    func browseCatalog(
        contentType: String,
        catalogId: String,
        page: Int,
        genre: String?,
        year: Int?,
        sort: String?
    ) async throws -> CatalogPage {
        // Simulate network delay
        try await Task.sleep(nanoseconds: 600_000_000) // 0.6 seconds

        // Generate 20 items per page (standard pagination size)
        let startIndex = (page - 1) * 20 + 1
        let endIndex = page * 20

        let items = (startIndex...endIndex).map { index in
            var meta = generateMockMeta(id: "\(contentType)_\(index)", type: contentType)

            // Filter by genre if specified
            if let genre = genre {
                meta = Meta(
                    id: meta.id,
                    name: meta.name,
                    description: meta.description,
                    posterUrl: meta.posterUrl,
                    backgroundUrl: meta.backgroundUrl,
                    logoUrl: meta.logoUrl,
                    imdbId: meta.imdbId,
                    tmdbId: meta.tmdbId,
                    type: meta.type,
                    year: meta.year,
                    genres: [genre] + (meta.genres?.filter { $0 != genre } ?? []),
                    rating: meta.rating,
                    releaseInfo: meta.releaseInfo,
                    runtime: meta.runtime,
                    cast: meta.cast,
                    director: meta.director,
                    writer: meta.writer,
                    certification: meta.certification,
                    country: meta.country,
                    released: meta.released
                )
            }

            // Filter by year if specified
            if let year = year {
                meta = Meta(
                    id: meta.id,
                    name: meta.name,
                    description: meta.description,
                    posterUrl: meta.posterUrl,
                    backgroundUrl: meta.backgroundUrl,
                    logoUrl: meta.logoUrl,
                    imdbId: meta.imdbId,
                    tmdbId: meta.tmdbId,
                    type: meta.type,
                    year: year,
                    genres: meta.genres,
                    rating: meta.rating,
                    releaseInfo: meta.releaseInfo,
                    runtime: meta.runtime,
                    cast: meta.cast,
                    director: meta.director,
                    writer: meta.writer,
                    certification: meta.certification,
                    country: meta.country,
                    released: meta.released
                )
            }

            return meta
        }

        // Simulate having more pages (limit to 5 pages for demo)
        let hasMore = page < 5

        return CatalogPage(items: items, hasMore: hasMore, page: page)
    }

    func getGenres(contentType: String) async throws -> [String] {
        // Simulate network delay
        try await Task.sleep(nanoseconds: 200_000_000) // 0.2 seconds

        return mockGenres
    }
}
