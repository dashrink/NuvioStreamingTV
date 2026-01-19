import Foundation
import Combine

@MainActor
public class LibraryViewModel: ObservableObject {
    @Published public var items: [StremioMeta] = []
    @Published public var sortOption: SortOption = .dateAdded
    @Published public var groupOption: GroupOption = .none
    
    public enum SortOption: String, CaseIterable, Identifiable {
        case dateAdded = "Date Added"
        case title = "Title"
        case year = "Year"
        
        public var id: String { self.rawValue }
    }
    
    public enum GroupOption: String, CaseIterable, Identifiable {
        case none = "None"
        case type = "Type"
        
        public var id: String { self.rawValue }
    }
    
    public init() {
        loadLibrary()
    }
    
    public func loadLibrary() {
        // Mock data
        self.items = []
    }
    
    public var sortedAndGroupedItems: [String: [StremioMeta]] {
        var result: [String: [StremioMeta]] = [:]
        
        let sorted = items.sorted { first, second in
            switch sortOption {
            case .dateAdded: return true // Mock
            case .title: return first.name < second.name
            case .year: return (first.releaseInfo ?? "") > (second.releaseInfo ?? "")
            }
        }
        
        switch groupOption {
        case .none:
            result["All"] = sorted
        case .type:
            result = Dictionary(grouping: sorted, by: { $0.type_ })
        }
        
        return result
    }
}
