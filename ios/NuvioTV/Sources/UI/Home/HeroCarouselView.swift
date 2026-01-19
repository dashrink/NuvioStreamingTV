//
//  HeroCarouselView.swift
//  NuvioTV
//
//  Created by Claude Code
//  Hero Carousel component for Home Screen
//

import SwiftUI

struct HeroCarouselView: View {
    let items: [Meta]
    let onSelect: (Meta) -> Void
    
    @State private var currentIndex: Int = 0
    @State private var timer = Timer.publish(every: 5, on: .main, in: .common).autoconnect()
    
    var body: some View {
        TabView(selection: $currentIndex) {
            ForEach(0..<items.count, id: \.self) { index in
                HeroItemView(meta: items[index], onSelect: { onSelect(items[index]) })
                    .tag(index)
            }
        }
        .tabViewStyle(.page(indexDisplayMode: .always))
        .frame(height: 500)
        #if os(tvOS)
        .frame(height: 600)
        #endif
        .onReceive(timer) { _ in
            withAnimation {
                currentIndex = (currentIndex + 1) % (items.isEmpty ? 1 : items.count)
            }
        }
    }
}

struct HeroItemView: View {
    let meta: Meta
    let onSelect: () -> Void
    
    var body: some View {
        Button(action: onSelect) {
            ZStack(alignment: .bottomLeading) {
                // Background Image
                AsyncImage(url: URL(string: meta.backgroundUrl ?? meta.posterUrl ?? "")) { phase in
                    switch phase {
                    case .empty:
                        Color.gray.opacity(0.3)
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    case .failure:
                        Color.gray.opacity(0.3)
                    @unknown default:
                        Color.gray.opacity(0.3)
                    }
                }
                .overlay(
                    LinearGradient(
                        gradient: Gradient(colors: [.black.opacity(0.8), .clear]),
                        startPoint: .bottom,
                        endPoint: .center
                    )
                )
                
                // Content
                VStack(alignment: .leading, spacing: 10) {
                    Text(meta.name)
                        #if os(tvOS)
                        .font(.largeTitle)
                        #else
                        .font(.title)
                        #endif
                        .bold()
                        .foregroundColor(.white)
                    
                    if let description = meta.description {
                        Text(description)
                            .lineLimit(3)
                            .foregroundColor(.white.opacity(0.8))
                            .font(.body)
                    }
                    
                    HStack {
                        if let year = meta.year {
                            Text(String(year))
                                .font(.caption)
                                .padding(5)
                                .background(Color.white.opacity(0.2))
                                .cornerRadius(5)
                        }
                        
                        if let rating = meta.rating {
                            Text(String(format: "%.1f", rating))
                                .font(.caption)
                                .foregroundColor(.yellow)
                        }
                    }
                    .foregroundColor(.white)
                }
                .padding()
                .padding(.bottom, 40)
            }
        }
        .buttonStyle(.plain) // Use plain style to avoid default button appearance overlaying the image weirdly
    }
}
