//
//  DetailsScreen.swift
//  NuvioTV
//
//  Created by Claude Code
//  Content details screen with adaptive layouts for iOS/iPad/tvOS
//

import SwiftUI

struct DetailsScreen: View {
    let id: String
    let onPlayClick: (String) -> Void
    let onBack: () -> Void

    @StateObject private var viewModel: DetailsViewModel
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    init(
        id: String,
        repository: CatalogRepository,
        onPlayClick: @escaping (String) -> Void,
        onBack: @escaping () -> Void
    ) {
        self.id = id
        self.onPlayClick = onPlayClick
        self.onBack = onBack
        _viewModel = StateObject(wrappedValue: DetailsViewModel(repository: repository))
    }

    var body: some View {
        ZStack {
            if viewModel.uiState.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = viewModel.uiState.error {
                ErrorView(
                    error: error,
                    onRetry: { viewModel.loadDetails(id: id) },
                    onBack: onBack
                )
            } else if viewModel.uiState.meta != nil {
                #if os(tvOS)
                TvDetailsContent(
                    uiState: viewModel.uiState,
                    onPlayClick: {
                        if let url = viewModel.uiState.streams.first?.url {
                            onPlayClick(url)
                        }
                    },
                    onWatchlistClick: { viewModel.toggleWatchlist() },
                    onRateClick: { /* TODO: Show rating dialog */ },
                    onShareClick: { shareContent(viewModel.uiState.meta!) },
                    onBack: onBack
                )
                #else
                MobileDetailsContent(
                    uiState: viewModel.uiState,
                    onPlayClick: {
                        if let url = viewModel.uiState.streams.first?.url {
                            onPlayClick(url)
                        }
                    },
                    onWatchlistClick: { viewModel.toggleWatchlist() },
                    onRateClick: { /* TODO: Show rating dialog */ },
                    onShareClick: { shareContent(viewModel.uiState.meta!) },
                    onBack: onBack
                )
                #endif
            }
        }
        .onAppear {
            viewModel.loadDetails(id: id)
        }
    }

    private func shareContent(_ meta: Meta) {
        var shareText = "Check out \(meta.name)"
        if let year = meta.year {
            shareText += " (\(year))"
        }
        shareText += "\n\n"
        if let description = meta.description {
            shareText += description
        }
        if let imdbId = meta.imdbId {
            shareText += "\n\nhttps://www.imdb.com/title/\(imdbId)"
        }

        #if !os(tvOS)
        let activityVC = UIActivityViewController(
            activityItems: [shareText],
            applicationActivities: nil
        )

        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let rootVC = windowScene.windows.first?.rootViewController {
            rootVC.present(activityVC, animated: true)
        }
        #endif
    }
}

struct TvDetailsContent: View {
    let uiState: DetailsUiState
    let onPlayClick: () -> Void
    let onWatchlistClick: () -> Void
    let onRateClick: () -> Void
    let onShareClick: () -> Void
    let onBack: () -> Void

    var body: some View {
        guard let meta = uiState.meta else { return AnyView(EmptyView()) }

        return AnyView(
            ZStack {
                // Background image with gradient
                if let backgroundUrl = meta.backgroundUrl ?? meta.posterUrl {
                    AsyncImage(url: URL(string: backgroundUrl)) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Color.black
                    }
                    .ignoresSafeArea()
                }

                // Gradient overlay
                LinearGradient(
                    colors: [
                        Color.black.opacity(0.3),
                        Color.black.opacity(0.7),
                        Color.black
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea()

                // Content
                ScrollView {
                    VStack(alignment: .leading, spacing: 48) {
                        // Back button
                        Button(action: onBack) {
                            Image(systemName: "chevron.left")
                                .font(.title)
                                .foregroundColor(.white)
                        }
                        .buttonStyle(.plain)

                        // Metadata info
                        TvMetadataInfo(meta: meta)

                        // Action buttons
                        TvActionButtons(
                            onPlayClick: onPlayClick,
                            onWatchlistClick: onWatchlistClick,
                            onRateClick: onRateClick,
                            onShareClick: onShareClick,
                            isInWatchlist: uiState.isInWatchlist
                        )

                        // Cast and Crew
                        CastCrewSection(
                            cast: meta.cast,
                            director: meta.director,
                            writer: meta.writer
                        )
                    }
                    .padding(48)
                }
            }
        )
    }
}

struct MobileDetailsContent: View {
    let uiState: DetailsUiState
    let onPlayClick: () -> Void
    let onWatchlistClick: () -> Void
    let onRateClick: () -> Void
    let onShareClick: () -> Void
    let onBack: () -> Void

    var body: some View {
        guard let meta = uiState.meta else { return AnyView(EmptyView()) }

        return AnyView(
            ZStack(alignment: .top) {
                ScrollView {
                    VStack(spacing: 0) {
                        // Background image with gradient
                        ZStack(alignment: .bottom) {
                            if let backgroundUrl = meta.backgroundUrl ?? meta.posterUrl {
                                AsyncImage(url: URL(string: backgroundUrl)) { image in
                                    image
                                        .resizable()
                                        .aspectRatio(contentMode: .fill)
                                } placeholder: {
                                    Color.black
                                }
                                .frame(height: 400)
                                .clipped()
                            }

                            // Gradient overlay
                            LinearGradient(
                                colors: [
                                    Color.clear,
                                    Color.black.opacity(0.6),
                                    Color.black
                                ],
                                startPoint: .top,
                                endPoint: .bottom
                            )
                            .frame(height: 400)
                        }

                        // Content
                        VStack(alignment: .leading, spacing: 24) {
                            // Metadata info
                            MetadataInfo(meta: meta)

                            // Action buttons
                            ActionButtons(
                                onPlayClick: onPlayClick,
                                onWatchlistClick: onWatchlistClick,
                                onRateClick: onRateClick,
                                onShareClick: onShareClick,
                                isInWatchlist: uiState.isInWatchlist
                            )

                            // Cast and Crew
                            CastCrewSection(
                                cast: meta.cast,
                                director: meta.director,
                                writer: meta.writer
                            )
                        }
                        .padding(24)
                        .background(Color.black)
                    }
                }
                .ignoresSafeArea(edges: .top)

                // Back button overlay
                Button(action: onBack) {
                    Image(systemName: "chevron.left")
                        .font(.title2)
                        .foregroundColor(.white)
                        .frame(width: 44, height: 44)
                        .background(
                            Circle()
                                .fill(Color.black.opacity(0.5))
                        )
                }
                .buttonStyle(.plain)
                .padding(16)
            }
        )
    }
}

struct ErrorView: View {
    let error: String
    let onRetry: () -> Void
    let onBack: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            Text("Error")
                .font(.title)
                .foregroundColor(.red)

            Text(error)
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)

            HStack(spacing: 16) {
                Button("Retry", action: onRetry)
                    .buttonStyle(.borderedProminent)

                Button("Go Back", action: onBack)
                    .buttonStyle(.bordered)
            }
        }
        .padding(32)
    }
}
