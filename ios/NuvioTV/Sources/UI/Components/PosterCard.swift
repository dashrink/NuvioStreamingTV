//
//  PosterCard.swift
//  NuvioTV
//
//  Created by Claude Code
//  Reusable poster card component for iOS/tvOS
//

import SwiftUI

/// Poster card component with focus animation (tvOS) and tap handling (iOS)
struct PosterCard: View {
    let meta: Meta
    let onClick: () -> Void

    #if os(tvOS)
    @FocusState private var isFocused: Bool
    #endif

    var body: some View {
        Button(action: onClick) {
            VStack(alignment: .center, spacing: 8) {
                // Poster image
                AsyncImage(url: URL(string: meta.posterUrl ?? "")) { phase in
                    switch phase {
                    case .empty:
                        placeholderView
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    case .failure:
                        placeholderView
                    @unknown default:
                        placeholderView
                    }
                }
                .frame(width: 150, height: 225) // 2:3 aspect ratio
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(focusedBorderColor, lineWidth: focusedBorderWidth)
                )
                .shadow(color: .black.opacity(shadowOpacity), radius: shadowRadius)

                // Title
                Text(meta.name)
                    .font(.caption)
                    .foregroundColor(titleColor)
                    .lineLimit(1)
                    .truncationMode(.tail)
                    .frame(maxWidth: 150)
            }
        }
        .buttonStyle(PosterCardButtonStyle())
        #if os(tvOS)
        .focusable(true)
        .focused($isFocused)
        #endif
    }

    // MARK: - Helper Views

    private var placeholderView: some View {
        ZStack {
            Rectangle()
                .fill(Color.gray.opacity(0.3))
            Image(systemName: "photo")
                .resizable()
                .scaledToFit()
                .frame(width: 50, height: 50)
                .foregroundColor(.gray)
        }
    }

    // MARK: - Computed Properties

    #if os(tvOS)
    private var focusedBorderColor: Color {
        isFocused ? .white : .clear
    }

    private var focusedBorderWidth: CGFloat {
        isFocused ? 4 : 0
    }

    private var shadowOpacity: Double {
        isFocused ? 0.5 : 0.2
    }

    private var shadowRadius: CGFloat {
        isFocused ? 12 : 4
    }

    private var titleColor: Color {
        isFocused ? .white : .gray
    }
    #else
    private var focusedBorderColor: Color {
        .clear
    }

    private var focusedBorderWidth: CGFloat {
        0
    }

    private var shadowOpacity: Double {
        0.2
    }

    private var shadowRadius: CGFloat {
        4
    }

    private var titleColor: Color {
        .primary
    }
    #endif
}

/// Custom button style for poster cards
struct PosterCardButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            #if os(tvOS)
            .scaleEffect(configuration.isPressed ? 1.05 : 1.0)
            #else
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
            #endif
            .animation(.easeInOut(duration: 0.2), value: configuration.isPressed)
    }
}

// MARK: - Preview

#if DEBUG
struct PosterCard_Previews: PreviewProvider {
    static var previews: some View {
        let sampleMeta = Meta(
            id: "1",
            name: "Sample Movie",
            description: "A sample movie description",
            posterUrl: "https://via.placeholder.com/300x450",
            backgroundUrl: nil,
            logoUrl: nil,
            imdbId: "tt1234567",
            tmdbId: nil,
            type: "movie",
            year: 2024,
            genres: ["Action", "Drama"],
            rating: 8.5,
            releaseInfo: nil,
            runtime: "120 min",
            cast: nil,
            director: nil,
            writer: nil,
            certification: nil,
            country: nil,
            released: nil
        )

        PosterCard(meta: sampleMeta) {
            print("Tapped!")
        }
        .previewLayout(.sizeThatFits)
        .padding()
        .background(Color.black)
    }
}
#endif
