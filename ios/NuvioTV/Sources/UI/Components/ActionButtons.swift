//
//  ActionButtons.swift
//  NuvioTV
//
//  Created by Claude Code
//  Action buttons for content details (play, watchlist, rate, share)
//

import SwiftUI

struct ActionButtons: View {
    let onPlayClick: () -> Void
    let onWatchlistClick: () -> Void
    let onRateClick: () -> Void
    let onShareClick: () -> Void
    let isInWatchlist: Bool

    var body: some View {
        HStack(spacing: 16) {
            // Play button - primary action
            Button(action: onPlayClick) {
                HStack(spacing: 8) {
                    Image(systemName: "play.fill")
                    Text("Watch Now")
                }
                .frame(height: 56)
                .padding(.horizontal, 24)
            }
            .buttonStyle(.borderedProminent)

            // Watchlist button
            Button(action: onWatchlistClick) {
                HStack(spacing: 8) {
                    Image(systemName: isInWatchlist ? "checkmark" : "plus")
                    Text(isInWatchlist ? "In Watchlist" : "Watchlist")
                }
                .frame(height: 56)
                .padding(.horizontal, 20)
            }
            .buttonStyle(.bordered)

            // Rate button
            Button(action: onRateClick) {
                Image(systemName: "star.fill")
                    .foregroundColor(.yellow)
            }
            .buttonStyle(.borderless)

            // Share button
            Button(action: onShareClick) {
                Image(systemName: "square.and.arrow.up")
            }
            .buttonStyle(.borderless)
        }
    }
}

struct TvActionButtons: View {
    let onPlayClick: () -> Void
    let onWatchlistClick: () -> Void
    let onRateClick: () -> Void
    let onShareClick: () -> Void
    let isInWatchlist: Bool

    var body: some View {
        HStack(spacing: 24) {
            // Play button - primary action with larger size for TV
            Button(action: onPlayClick) {
                HStack(spacing: 12) {
                    Image(systemName: "play.fill")
                        .font(.system(size: 24))
                    Text("Watch Now")
                        .font(.title3)
                }
                .frame(height: 64)
                .padding(.horizontal, 32)
            }
            .buttonStyle(.borderedProminent)

            // Watchlist button
            Button(action: onWatchlistClick) {
                HStack(spacing: 12) {
                    Image(systemName: isInWatchlist ? "checkmark" : "plus")
                        .font(.system(size: 20))
                    Text(isInWatchlist ? "In Watchlist" : "Watchlist")
                        .font(.title3)
                }
                .frame(height: 64)
                .padding(.horizontal, 28)
            }
            .buttonStyle(.bordered)

            // Rate button
            Button(action: onRateClick) {
                HStack(spacing: 12) {
                    Image(systemName: "star.fill")
                        .font(.system(size: 20))
                        .foregroundColor(.yellow)
                    Text("Rate")
                        .font(.title3)
                }
                .frame(height: 64)
                .padding(.horizontal, 28)
            }
            .buttonStyle(.bordered)

            // Share button
            Button(action: onShareClick) {
                HStack(spacing: 12) {
                    Image(systemName: "square.and.arrow.up")
                        .font(.system(size: 20))
                    Text("Share")
                        .font(.title3)
                }
                .frame(height: 64)
                .padding(.horizontal, 28)
            }
            .buttonStyle(.bordered)
        }
    }
}
