//
//  DetailsViewModel.swift
//  NuvioTV
//
//  Created by Claude Code
//  ViewModel for content details screen
//

import Foundation
import Combine

@MainActor
class DetailsViewModel: ObservableObject {
    @Published private(set) var uiState = DetailsUiState()

    private let repository: CatalogRepository

    init(repository: CatalogRepository) {
        self.repository = repository
    }

    func loadDetails(id: String) {
        Task {
            uiState = DetailsUiState(isLoading: true, error: nil)

            do {
                let meta = try await repository.getMetadata(id: id)
                uiState.meta = meta
                uiState.isLoading = false

                // Load streams in background
                loadStreams(id: id, type: meta.type)
            } catch {
                uiState.isLoading = false
                uiState.error = error.localizedDescription
            }
        }
    }

    private func loadStreams(id: String, type: String) {
        Task {
            do {
                let streams = try await repository.getStreams(id: id, type: type)
                uiState.streams = streams
            } catch {
                // Streams failure is not critical, just log it
                print("Failed to load streams: \(error.localizedDescription)")
            }
        }
    }

    func toggleWatchlist() {
        uiState.isInWatchlist.toggle()
        // TODO: Persist to ProfileRepository via profile preferences
        // The Rust SDK ProfileManager stores preferences in Profile.preferences
        // Need to update profile with watchlist items in preferences field
    }

    func rateContent(rating: Int) {
        uiState.userRating = rating
        // TODO: Submit rating to ProfileRepository via profile preferences
        // The Rust SDK ProfileManager stores preferences in Profile.preferences
        // Need to update profile with ratings in preferences field
    }
}
