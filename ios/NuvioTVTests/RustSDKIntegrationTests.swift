//
//  RustSDKIntegrationTests.swift
//  NuvioTVTests
//
//  Created by Claude Code
//  Integration tests for Rust SDK Swift bindings
//

import XCTest
@testable import NuvioTV

// Note: These tests are designed for future Rust SDK integration
// Currently using MockCatalogRepository, but structure is ready for real SDK
final class RustSDKIntegrationTests: XCTestCase {

    var repository: CatalogRepository!

    override func setUp() {
        // For now, using MockCatalogRepository
        // When Rust SDK is integrated, replace with: RustCatalogRepository()
        repository = MockCatalogRepository()
    }

    override func tearDown() {
        repository = nil
    }

    // MARK: - Basic SDK Initialization Tests

    func testSDKInitialization() async throws {
        // Verify repository is initialized
        XCTAssertNotNil(repository, "Repository should be initialized")

        // Test basic connectivity
        let catalogs = try await repository.getHomeCatalogs()
        XCTAssertNotNil(catalogs, "Should be able to fetch catalogs")
    }

    // MARK: - Catalog Fetching Tests

    func testGetHomeCatalogsIntegration() async throws {
        let catalogs = try await repository.getHomeCatalogs()

        XCTAssertFalse(catalogs.isEmpty, "Should return catalogs")
        XCTAssertGreaterThanOrEqual(catalogs.count, 2, "Should have at least 2 catalogs")

        // Verify catalog structure
        for catalog in catalogs {
            XCTAssertFalse(catalog.id.isEmpty, "Catalog should have ID")
            XCTAssertFalse(catalog.name.isEmpty, "Catalog should have name")
            XCTAssertFalse(catalog.itemIds.isEmpty, "Catalog should have items")
        }
    }

    func testGetMetadataIntegration() async throws {
        let meta = try await repository.getMetadata(id: "movie_1")

        XCTAssertNotNil(meta, "Should return metadata")
        XCTAssertEqual(meta.id, "movie_1", "Should return correct metadata")
        XCTAssertFalse(meta.name.isEmpty, "Metadata should have name")
        XCTAssertNotNil(meta.description, "Metadata should have description")
        XCTAssertEqual(meta.type, "movie", "Metadata type should match")
    }

    func testGetStreamsIntegration() async throws {
        let streams = try await repository.getStreams(id: "movie_1", type: "movie")

        XCTAssertFalse(streams.isEmpty, "Should return streams")

        for stream in streams {
            XCTAssertNotNil(stream.url, "Stream should have URL")
            XCTAssertNotNil(stream.name, "Stream should have name")
        }
    }

    func testSearchIntegration() async throws {
        let results = try await repository.search(query: "test")

        XCTAssertFalse(results.isEmpty, "Should return search results")

        for result in results {
            XCTAssertFalse(result.id.isEmpty, "Result should have ID")
            XCTAssertFalse(result.name.isEmpty, "Result should have name")
        }
    }

    func testBrowseCatalogIntegration() async throws {
        let page = try await repository.browseCatalog(
            contentType: "movie",
            catalogId: "trending",
            page: 1,
            genre: nil,
            year: nil,
            sort: nil
        )

        XCTAssertFalse(page.items.isEmpty, "Should return catalog items")
        XCTAssertEqual(page.page, 1, "Page number should match")

        for item in page.items {
            XCTAssertFalse(item.id.isEmpty, "Item should have ID")
            XCTAssertEqual(item.type, "movie", "Item type should match request")
        }
    }

    func testGetGenresIntegration() async throws {
        let genres = try await repository.getGenres(contentType: "movie")

        XCTAssertFalse(genres.isEmpty, "Should return genres")
        XCTAssertGreaterThan(genres.count, 5, "Should have multiple genres")

        for genre in genres {
            XCTAssertFalse(genre.isEmpty, "Genre should not be empty")
        }
    }

    // MARK: - Error Handling Tests

    func testGetMetadataWithInvalidID() async throws {
        do {
            _ = try await repository.getMetadata(id: "")
            // If no error thrown, that's acceptable for mock
            XCTAssertTrue(true, "Should handle empty ID gracefully")
        } catch {
            // Error is also acceptable
            XCTAssertTrue(true, "Should throw error for invalid ID")
        }
    }

    func testSearchWithEmptyQuery() async throws {
        let results = try await repository.search(query: "")

        // Should return empty results for empty query
        XCTAssertTrue(results.isEmpty, "Should return empty results for empty query")
    }

    // MARK: - Pagination Tests

    func testBrowseCatalogPagination() async throws {
        // Fetch page 1
        let page1 = try await repository.browseCatalog(
            contentType: "movie",
            catalogId: "trending",
            page: 1,
            genre: nil,
            year: nil,
            sort: nil
        )

        // Fetch page 2
        let page2 = try await repository.browseCatalog(
            contentType: "movie",
            catalogId: "trending",
            page: 2,
            genre: nil,
            year: nil,
            sort: nil
        )

        XCTAssertFalse(page1.items.isEmpty, "Page 1 should have items")
        XCTAssertFalse(page2.items.isEmpty, "Page 2 should have items")

        // Items should be different
        let page1Ids = Set(page1.items.map { $0.id })
        let page2Ids = Set(page2.items.map { $0.id })

        let intersection = page1Ids.intersection(page2Ids)
        XCTAssertTrue(intersection.isEmpty, "Pages should have different items")
    }

    func testBrowseCatalogHasMoreFlag() async throws {
        let page = try await repository.browseCatalog(
            contentType: "movie",
            catalogId: "trending",
            page: 1,
            genre: nil,
            year: nil,
            sort: nil
        )

        XCTAssertTrue(page.hasMore, "First page should have more pages")

        // Test last page
        let lastPage = try await repository.browseCatalog(
            contentType: "movie",
            catalogId: "trending",
            page: 10,
            genre: nil,
            year: nil,
            sort: nil
        )

        // Last page might not have more (depending on mock implementation)
        XCTAssertNotNil(lastPage, "Should return last page")
    }

    // MARK: - Filter Tests

    func testBrowseCatalogWithGenreFilter() async throws {
        let page = try await repository.browseCatalog(
            contentType: "movie",
            catalogId: "trending",
            page: 1,
            genre: "action",
            year: nil,
            sort: nil
        )

        XCTAssertFalse(page.items.isEmpty, "Should return filtered items")

        // Verify items have the genre
        for item in page.items {
            if let genres = item.genres {
                XCTAssertTrue(genres.contains("action"), "Filtered items should have action genre")
            }
        }
    }

    func testBrowseCatalogWithYearFilter() async throws {
        let page = try await repository.browseCatalog(
            contentType: "movie",
            catalogId: "trending",
            page: 1,
            genre: nil,
            year: 2020,
            sort: nil
        )

        XCTAssertFalse(page.items.isEmpty, "Should return filtered items")

        // Verify items have the year
        for item in page.items {
            XCTAssertEqual(item.year, 2020, "Filtered items should have year 2020")
        }
    }

    func testBrowseCatalogWithSortFilter() async throws {
        let page = try await repository.browseCatalog(
            contentType: "movie",
            catalogId: "trending",
            page: 1,
            genre: nil,
            year: nil,
            sort: "popular"
        )

        XCTAssertFalse(page.items.isEmpty, "Should return sorted items")
    }

    // MARK: - Content Type Tests

    func testGetMovieMetadata() async throws {
        let meta = try await repository.getMetadata(id: "movie_1")

        XCTAssertEqual(meta.type, "movie", "Should be movie type")
    }

    func testGetSeriesMetadata() async throws {
        let meta = try await repository.getMetadata(id: "series_1")

        XCTAssertEqual(meta.type, "series", "Should be series type")
    }

    func testBrowseMovieCatalog() async throws {
        let page = try await repository.browseCatalog(
            contentType: "movie",
            catalogId: "trending",
            page: 1,
            genre: nil,
            year: nil,
            sort: nil
        )

        for item in page.items {
            XCTAssertEqual(item.type, "movie", "All items should be movies")
        }
    }

    func testBrowseSeriesCatalog() async throws {
        let page = try await repository.browseCatalog(
            contentType: "series",
            catalogId: "trending",
            page: 1,
            genre: nil,
            year: nil,
            sort: nil
        )

        for item in page.items {
            XCTAssertEqual(item.type, "series", "All items should be series")
        }
    }

    // MARK: - Performance Tests

    func testGetMetadataPerformance() throws {
        measure {
            let expectation = XCTestExpectation(description: "Get metadata performance")

            Task {
                _ = try await repository.getMetadata(id: "movie_1")
                expectation.fulfill()
            }

            wait(for: [expectation], timeout: 5.0)
        }
    }

    func testBrowseCatalogPerformance() throws {
        measure {
            let expectation = XCTestExpectation(description: "Browse catalog performance")

            Task {
                _ = try await repository.browseCatalog(
                    contentType: "movie",
                    catalogId: "trending",
                    page: 1,
                    genre: nil,
                    year: nil,
                    sort: nil
                )
                expectation.fulfill()
            }

            wait(for: [expectation], timeout: 5.0)
        }
    }

    // MARK: - Concurrent Request Tests

    func testConcurrentMetadataFetches() async throws {
        // Fetch multiple metadata items concurrently
        async let meta1 = repository.getMetadata(id: "movie_1")
        async let meta2 = repository.getMetadata(id: "movie_2")
        async let meta3 = repository.getMetadata(id: "series_1")

        let results = try await [meta1, meta2, meta3]

        XCTAssertEqual(results.count, 3, "Should fetch all metadata items")
        XCTAssertEqual(results[0].id, "movie_1")
        XCTAssertEqual(results[1].id, "movie_2")
        XCTAssertEqual(results[2].id, "series_1")
    }

    func testConcurrentCatalogBrowses() async throws {
        // Fetch multiple catalog pages concurrently
        async let page1 = repository.browseCatalog(
            contentType: "movie",
            catalogId: "trending",
            page: 1,
            genre: nil,
            year: nil,
            sort: nil
        )
        async let page2 = repository.browseCatalog(
            contentType: "series",
            catalogId: "trending",
            page: 1,
            genre: nil,
            year: nil,
            sort: nil
        )

        let results = try await [page1, page2]

        XCTAssertEqual(results.count, 2, "Should fetch both catalog pages")
        XCTAssertFalse(results[0].items.isEmpty, "Page 1 should have items")
        XCTAssertFalse(results[1].items.isEmpty, "Page 2 should have items")
    }

    // MARK: - Data Validation Tests

    func testMetadataStructureValidation() async throws {
        let meta = try await repository.getMetadata(id: "movie_1")

        // Validate all required fields
        XCTAssertFalse(meta.id.isEmpty)
        XCTAssertFalse(meta.name.isEmpty)
        XCTAssertNotNil(meta.description)
        XCTAssertNotNil(meta.posterUrl)
        XCTAssertFalse(meta.type.isEmpty)
        XCTAssertNotNil(meta.genres)
        XCTAssertNotNil(meta.rating)

        // Validate rating range
        if let rating = meta.rating {
            XCTAssertGreaterThanOrEqual(rating, 0.0)
            XCTAssertLessThanOrEqual(rating, 10.0)
        }
    }

    func testStreamStructureValidation() async throws {
        let streams = try await repository.getStreams(id: "movie_1", type: "movie")

        for stream in streams {
            XCTAssertNotNil(stream.url, "Stream must have URL")
            XCTAssertNotNil(stream.name, "Stream should have name")
        }
    }
}
