import SwiftUI

public struct SearchView: View {
    @StateObject private var viewModel: SearchViewModel
    
    public init(viewModel: SearchViewModel = SearchViewModel()) {
        _viewModel = StateObject(wrappedValue: viewModel)
    }
    
    public var body: some View {
        VStack {
            // Search Bar
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(.gray)
                TextField("Search...", text: $viewModel.searchText)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    #if os(tvOS)
                    .focusable(true)
                    #endif
                
                if !viewModel.searchText.isEmpty {
                    Button(action: {
                        viewModel.searchText = ""
                    }) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.gray)
                    }
                }
            }
            .padding()
            
            // Filters
            HStack {
                FilterButton(title: "Movies", isSelected: viewModel.selectedType == "movie") {
                    viewModel.setType("movie")
                }
                FilterButton(title: "Series", isSelected: viewModel.selectedType == "series") {
                    viewModel.setType("series")
                }
            }
            .padding(.bottom)
            
            if viewModel.isLoading {
                ProgressView()
                    .padding()
            } else if let error = viewModel.error {
                Text(error)
                    .foregroundColor(.red)
                    .padding()
            } else {
                ScrollView {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 120))], spacing: 20) {
                        ForEach(viewModel.results, id: \.id) { item in
                            SearchResultItem(item: item)
                        }
                    }
                    .padding()
                }
            }
            
            Spacer()
        }
        .navigationTitle("Search")
    }
}

struct FilterButton: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(title)
                .padding(.horizontal, 20)
                .padding(.vertical, 10)
                .background(isSelected ? Color.blue : Color.gray.opacity(0.3))
                .foregroundColor(.white)
                .cornerRadius(20)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct SearchResultItem: View {
    let item: StremioMeta
    
    var body: some View {
        VStack {
            // Placeholder Poster
            Rectangle()
                .fill(Color.gray)
                .aspectRatio(2/3, contentMode: .fit)
                .overlay(
                    AsyncImage(url: URL(string: item.poster ?? "")) { image in
                        image.resizable()
                    } placeholder: {
                        Color.gray
                    }
                )
                .cornerRadius(8)
            
            Text(item.name)
                .font(.caption)
                .lineLimit(2)
                .foregroundColor(.primary)
        }
    }
}
