import Foundation

public enum AppRoute: Hashable, Codable, Identifiable {
    case home
    case details(id: String)
    case player(id: String)
    case search
    case settings
    case library
    case profile
    
    public var id: String {
        switch self {
        case .home: return "home"
        case .details(let id): return "details_\(id)"
        case .player(let id): return "player_\(id)"
        case .search: return "search"
        case .settings: return "settings"
        case .library: return "library"
        case .profile: return "profile"
        }
    }
}
