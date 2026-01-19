import SwiftUI

public class NavigationManager: ObservableObject {
    // Navigation Path for iOS 16+ NavigationStack
    @Published public var path = NavigationPath()
    
    // Selected Tab for TabView / SplitView Sidebar
    @Published public var selectedTab: AppRoute = .home
    
    // Split View visibility for iPad/macOS
    @Published public var columnVisibility: NavigationSplitViewVisibility = .all
    
    public init() {}
    
    // Navigate to a specific route
    public func navigate(to route: AppRoute) {
        path.append(route)
    }
    
    // Go back one step
    public func pop() {
        if !path.isEmpty {
            path.removeLast()
        }
    }
    
    // Reset to root of current stack
    public func popToRoot() {
        path = NavigationPath()
    }
    
    // Handle Deep Linking
    public func handleDeepLink(url: URL) {
        // Example: nuvio://details/123
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: true),
              let host = components.host else { return }
        
        switch host {
        case "details":
            if let id = components.path.split(separator: "/").first {
                navigate(to: .details(id: String(id)))
            }
        case "player":
            if let id = components.path.split(separator: "/").first {
                navigate(to: .player(id: String(id)))
            }
        default:
            break
        }
    }
}
