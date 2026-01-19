import SwiftUI
import NuvioCore

public struct DestinationView: View {
    let route: AppRoute
    public init(for route: AppRoute) { self.route = route }
    
    public var body: some View {
        switch route {
        case .home: HomeView()
        case .details(let id): DetailsView(id: id)
        case .player(let id): PlayerView(id: id)
        case .search: SearchView()
        case .settings: SettingsView()
        case .library: LibraryView()
        case .profile: ProfileView()
        }
    }
}
