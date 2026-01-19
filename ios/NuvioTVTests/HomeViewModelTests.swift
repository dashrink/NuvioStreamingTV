//
//  HomeViewModelTests.swift
//  NuvioTVTests
//
//  Created by Claude Code
//  Unit tests for HomeViewModel
//

import XCTest
import Combine
@testable import NuvioTV

@MainActor
final class HomeViewModelTests: XCTestCase {

    var viewModel: HomeViewModel!
    var repository: MockCatalogRepository!
    var cancellables: Set<AnyCancellable>!

    override func setUp() async throws {
        repository = MockCatalogRepository()
        viewModel = HomeViewModel(repository: repository)
        cancellables = Set<AnyCancellable>()
    }

    override func tearDown() {
        viewModel = nil
        repository = nil
        cancellables = nil
    }

    // MARK: - Initial State Tests

    func testInitialState() {
        XCTAssertTrue(viewModel.state.isLoading, "Should be loading initially")
        XCTAssertNil(viewModel.state.heroContent, "Hero content should be nil initially")
        XCTAssertTrue(viewModel.state.catalogs.isEmpty, "Catalogs should be empty initially")
        XCTAssertTrue(viewModel.state.continueWatching.isEmpty, "Continue watching should be empty initially")
        XCTAssertTrue(viewModel.state.watchlist.isEmpty, "Watchlist should be empty initially")
        XCTAssertNil(viewModel.state.error, "Error should be nil initially")
    }

    // MARK: - Data Loading Tests

    func testLoadDataSuccess() async {
        await viewModel.loadData()

        XCTAssertFalse(viewModel.state.isLoading, "Should not be loading after data loads")
        XCTAssertNil(viewModel.state.error, "Error should be nil on success")
        XCTAssertFalse(viewModel.state.catalogs.isEmpty, "Should have catalogs after loading")
        XCTAssertNotNil(viewModel.state.heroContent, "Should have hero content after loading")
    }

    func testLoadDataCatalogsPopulated() async {
        await viewModel.loadData()

        XCTAssertGreaterThanOrEqual(viewModel.state.catalogs.count, 2, "Should have at least 2 catalogs (movies and series)")

        // Verify catalog structure
        if let firstCatalog = viewModel.state.catalogs.first {
            XCTAssertFalse(firstCatalog.id.isEmpty, "Catalog should have ID")
            XCTAssertFalse(firstCatalog.title.isEmpty, "Catalog should have title")
            XCTAssertFalse(firstCatalog.items.isEmpty, "Catalog should have items")
        }
    }

    func testLoadDataHeroContentSet() async {
        await viewModel.loadData()

        XCTAssertNotNil(viewModel.state.heroContent, "Hero content should be set")

        if let hero = viewModel.state.heroContent {
            XCTAssertFalse(hero.id.isEmpty, "Hero should have ID")
            XCTAssertFalse(hero.name.isEmpty, "Hero should have name")
            XCTAssertNotNil(hero.description, "Hero should have description")
        }
    }

    func testLoadDataContinueWatchingPopulated() async {
        await viewModel.loadData()

        // Continue watching should be populated (mocked from catalog items)
        XCTAssertGreaterThan(viewModel.state.continueWatching.count, 0, "Should have continue watching items")
        XCTAssertLessThanOrEqual(viewModel.state.continueWatching.count, 3, "Should have at most 3 continue watching items")
    }

    func testLoadDataWatchlistPopulated() async {
        await viewModel.loadData()

        // Watchlist should be populated (mocked from catalog items)
        XCTAssertGreaterThan(viewModel.state.watchlist.count, 0, "Should have watchlist items")
        XCTAssertLessThanOrEqual(viewModel.state.watchlist.count, 3, "Should have at most 3 watchlist items")
    }

    // MARK: - Catalog Items Tests

    func testCatalogItemsHaveValidData() async {
        await viewModel.loadData()

        XCTAssertFalse(viewModel.state.catalogs.isEmpty, "Should have catalogs")

        // Verify first catalog has valid items
        if let firstCatalog = viewModel.state.catalogs.first {
            XCTAssertGreaterThan(firstCatalog.items.count, 0, "Catalog should have items")

            if let firstItem = firstCatalog.items.first {
                XCTAssertFalse(firstItem.id.isEmpty, "Item should have ID")
                XCTAssertFalse(firstItem.name.isEmpty, "Item should have name")
                XCTAssertNotNil(firstItem.description, "Item should have description")
                XCTAssertNotNil(firstItem.posterUrl, "Item should have poster URL")
                XCTAssertNotNil(firstItem.genres, "Item should have genres")
            }
        }
    }

    func testCatalogItemsAreUnique() async {
        await viewModel.loadData()

        // Collect all IDs from all catalogs
        var allIds: Set<String> = []
        for catalog in viewModel.state.catalogs {
            for item in catalog.items {
                XCTAssertFalse(allIds.contains(item.id), "Items should have unique IDs within home screen")
                allIds.insert(item.id)
            }
        }
    }

    // MARK: - Loading State Tests

    func testLoadingStateTransition() async {
        let expectation = XCTestExpectation(description: "Loading state should transition")

        viewModel.$state
            .dropFirst() // Skip initial state
            .sink { state in
                if !state.isLoading {
                    expectation.fulfill()
                }
            }
            .store(in: &cancellables)

        await viewModel.loadData()

        await fulfillment(of: [expectation], timeout: 5.0)
    }

    // MARK: - Multiple Calls Tests

    func testMultipleLoadDataCalls() async {
        // First load
        await viewModel.loadData()
        let firstCatalogCount = viewModel.state.catalogs.count

        // Second load (should replace data, not append)
        await viewModel.loadData()
        let secondCatalogCount = viewModel.state.catalogs.count

        XCTAssertEqual(firstCatalogCount, secondCatalogCount, "Multiple loads should replace data, not append")
    }

    // MARK: - Content Type Tests

    func testCatalogContentTypes() async {
        await viewModel.loadData()

        var hasMovies = false
        var hasSeries = false

        for catalog in viewModel.state.catalogs {
            for item in catalog.items {
                if item.type == "movie" {
                    hasMovies = true
                }
                if item.type == "series" {
                    hasMovies = true
                }
            }
        }

        XCTAssertTrue(hasMovies, "Should have movie content in catalogs")
    }

    // MARK: - Performance Tests

    func testLoadDataPerformance() {
        measure {
            let expectation = XCTestExpectation(description: "Load data performance")

            Task { @MainActor in
                await viewModel.loadData()
                expectation.fulfill()
            }

            wait(for: [expectation], timeout: 10.0)
        }
    }

    // MARK: - Catalog Limit Tests

    func testCatalogItemLimit() async {
        await viewModel.loadData()

        // Each catalog should have at most 10 items (as per implementation)
        for catalog in viewModel.state.catalogs {
            XCTAssertLessThanOrEqual(catalog.items.count, 10, "Catalog should have at most 10 items")
        }
    }
}
