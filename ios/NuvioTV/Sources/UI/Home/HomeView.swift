//
//  HomeView.swift
//  NuvioTV
//
//  Created by Claude Code
//  Main Home Screen View
//

import SwiftUI

struct HomeView: View {
    @StateObject private var viewModel: HomeViewModel
    let onNavigateToDetails: (String) -> Void
    
    init(repository: CatalogRepository = MockCatalogRepository(), onNavigateToDetails: @escaping (String) -> Void) {
        _viewModel = StateObject(wrappedValue: HomeViewModel(repository: repository))
        self.onNavigateToDetails = onNavigateToDetails
    }
    
    var body: some View {
        ScrollView {
            VStack(spacing: 30) {
                if viewModel.state.isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity, minHeight: 300)
                } else if let error = viewModel.state.error {
                    Text("Error: \(error)")
                        .foregroundColor(.red)
                } else {
                    // Hero Carousel
                    if let heroContent = viewModel.state.heroContent {
                        HeroCarouselView(items: [heroContent] + viewModel.state.continueWatching, onSelect: { meta in
                            onNavigateToDetails(meta.id)
                        })
                    }
                    
                    // Continue Watching
                    if !viewModel.state.continueWatching.isEmpty {
                        CategoryRowView(
                            title: "Continue Watching",
                            items: viewModel.state.continueWatching,
                            onSelect: { meta in
                                onNavigateToDetails(meta.id)
                            }
                        )
                    }
                    
                    // Watchlist
                    if !viewModel.state.watchlist.isEmpty {
                        CategoryRowView(
                            title: "Watchlist",
                            items: viewModel.state.watchlist,
                            onSelect: { meta in
                                onNavigateToDetails(meta.id)
                            }
                        )
                    }
                    
                    // Catalogs
                    ForEach(viewModel.state.catalogs) { catalog in
                        if !catalog.items.isEmpty {
                            CategoryRowView(
                                title: catalog.title,
                                items: catalog.items,
                                onSelect: { meta in
                                    onNavigateToDetails(meta.id)
                                }
                            )
                        }
                    }
                }
            }
            .padding(.bottom, 50)
        }
        .edgesIgnoringSafeArea(.top)
        .task {
            await viewModel.loadData()
        }
        #if os(iOS)
        .navigationTitle("Home")
        .navigationBarTitleDisplayMode(.hidden)
        #endif
    }
}

#if DEBUG
struct HomeView_Previews: PreviewProvider {
    static var previews: some View {
        HomeView(repository: MockCatalogRepository()) { id in
            print("Navigate to \(id)")
        }
    }
}
#endif
