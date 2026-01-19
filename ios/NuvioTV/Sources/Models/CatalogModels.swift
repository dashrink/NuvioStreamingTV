//
//  CatalogModels.swift
//  NuvioTV
//
//  Created by Claude Code
//  Swift data models for catalog browsing
//

import Foundation

// MARK: - Catalog Models

/// Catalog collection with items
struct Catalog: Identifiable, Codable {
    let id: String
    let name: String
    let description: String
    let itemIds: [String]
}

/// Content metadata
struct Meta: Identifiable, Codable {
    let id: String
    let name: String
    let description: String?
    let posterUrl: String?
    let backgroundUrl: String?
    let logoUrl: String?
    let imdbId: String?
    let tmdbId: Int?
    let type: String
    let year: Int?
    let genres: [String]?
    let rating: Double?
    let releaseInfo: String?
    let runtime: String?
    let cast: [String]?
    let director: [String]?
    let writer: [String]?
    let certification: String?
    let country: String?
    let released: String?
}

/// Video stream information
struct Stream: Identifiable, Codable {
    var id: String { url ?? UUID().uuidString }
    let url: String?
    let name: String?
    let description: String?
    let addonName: String?
}

/// Paginated catalog page
struct CatalogPage {
    let items: [Meta]
    let hasMore: Bool
    let page: Int
}

// MARK: - Filter & Sort Models

/// Filter state for catalog browsing
struct FilterState: Equatable {
    var contentType: String = "movie"
    var genre: String? = nil
    var year: Int? = nil
    var sort: SortOption = .trending
}

/// Sort options for catalog
enum SortOption: String, CaseIterable {
    case trending = "top"
    case popular = "popular"
    case newest = "newest"
    case rating = "rating"

    var displayName: String {
        switch self {
        case .trending: return "Trending"
        case .popular: return "Popular"
        case .newest: return "Newest"
        case .rating: return "Top Rated"
        }
    }

    var catalogId: String {
        return self.rawValue
    }
}

// MARK: - UI State

/// UI state for catalog browse screen
struct CatalogBrowseUiState {
    var isLoading: Bool = false
    var items: [Meta] = []
    var currentPage: Int = 1
    var hasMore: Bool = true
    var filterState: FilterState = FilterState()
    var availableGenres: [String] = []
    var error: String? = nil
    var isLoadingMore: Bool = false
}

/// UI state for details screen
struct DetailsUiState {
    var isLoading: Bool = true
    var meta: Meta? = nil
    var streams: [Stream] = []
    var error: String? = nil
    var isInWatchlist: Bool = false
    var userRating: Int? = nil
}
