import Foundation
import Combine

@MainActor
public class WatchlistViewModel: ObservableObject {
    @Published public var watchlist: [StremioMeta] = []
    
    // Placeholder for where we'd inject the Rust service for Library/Trakt
    // private let libraryService: LibraryService? 
    
    public init() {
        // Load from local storage or mock
        loadWatchlist()
    }
    
    public func loadWatchlist() {
        // Mock data for now as Rust SDK doesn't seem to expose Library yet
        self.watchlist = []
    }
    
    public func addToWatchlist(_ item: StremioMeta) {
        if !watchlist.contains(where: { $0.id == item.id }) {
            watchlist.append(item)
            // Sync with Rust SDK would happen here
        }
    }
    
    public func removeFromWatchlist(_ item: StremioMeta) {
        watchlist.removeAll(where: { $0.id == item.id })
        // Sync with Rust SDK would happen here
    }
    
    public func removeItem(at indexSet: IndexSet) {
        watchlist.remove(atOffsets: indexSet)
    }
}
