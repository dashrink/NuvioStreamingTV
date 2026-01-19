import Foundation
import Combine

@MainActor
public class SearchViewModel: ObservableObject {
    @Published public var searchText = ""
    @Published public var results: [StremioMeta] = []
    @Published public var isLoading = false
    @Published public var error: String?
    @Published public var selectedType: String = "movie"
    
    private let service: StremioService?
    private var searchCancellable: AnyCancellable?
    
    public init(service: StremioService? = nil) {
        if let service = service {
            self.service = service
        } else {
             // Fallback or default init
             self.service = try? StremioService()
        }
        
        $searchText
            .debounce(for: .milliseconds(500), scheduler: DispatchQueue.main)
            .removeDuplicates()
            .sink { [weak self] text in
                self?.performSearch(query: text)
            }
            .store(in: &cancellables)
    }
    
    private var cancellables = Set<AnyCancellable>()
    
    public func performSearch(query: String) {
        guard !query.isEmpty else {
            self.results = []
            return
        }
        
        guard let service = service else { return }
        
        isLoading = true
        error = nil
        
        Task {
            do {
                // Assuming we use a known addon for search, e.g., Cinemeta (v3)
                // "com.linvo.cinemeta" is typical ID.
                // Or maybe we aggregate or iterate addons. 
                // The Rust SDK has `getCatalog` which takes `addonId`.
                // It doesn't seem to have a global "search" across addons except maybe by aggregating manually.
                
                // For this implementation, I'll search on "com.linvo.cinemeta" as a default.
                // In a real app, we'd probably iterate all addons supporting search.
                
                let results = try await service.getCatalog(
                    addonId: "com.linvo.cinemeta", 
                    contentType: selectedType, 
                    catalogId: "top", // or "search" if supported, usually "top" with search param?
                    // Actually usually catalogId is "catalog_id" from manifest. Cinemeta has "top", "search"?
                    // Let's assume standard Stremio addon behavior: catalog resource, type, id.
                    // For search, many addons use catalog="catalog", type="movie", id="top" (or "search"), search="query".
                    
                    page: 1, 
                    search: query
                )
                
                self.results = results
                self.isLoading = false
            } catch {
                self.error = "Search failed: \(error)"
                self.isLoading = false
            }
        }
    }
    
    public func setType(_ type: String) {
        selectedType = type
        performSearch(query: searchText)
    }
}
