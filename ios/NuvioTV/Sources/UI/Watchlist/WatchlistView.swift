import SwiftUI

public struct WatchlistView: View {
    @StateObject private var viewModel: WatchlistViewModel
    
    public init(viewModel: WatchlistViewModel = WatchlistViewModel()) {
        _viewModel = StateObject(wrappedValue: viewModel)
    }
    
    public var body: some View {
        NavigationView {
            List {
                ForEach(viewModel.watchlist, id: \.id) { item in
                    NavigationLink(destination: Text("Details for \(item.name)")) {
                        HStack {
                            AsyncImage(url: URL(string: item.poster ?? "")) { image in
                                image.resizable()
                            } placeholder: {
                                Color.gray
                            }
                            .frame(width: 50, height: 75)
                            .cornerRadius(4)
                            
                            VStack(alignment: .leading) {
                                Text(item.name)
                                    .font(.headline)
                                Text(item.type_ )
                                    .font(.subheadline)
                                    .foregroundColor(.gray)
                            }
                        }
                    }
                }
                .onDelete(perform: viewModel.removeItem)
            }
            .navigationTitle("Watchlist")
            #if os(iOS)
            .listStyle(InsetGroupedListStyle())
            #endif
        }
    }
}
