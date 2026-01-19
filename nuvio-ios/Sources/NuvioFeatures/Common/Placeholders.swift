import SwiftUI

// Placeholder Views for Navigation Testing

public struct HomeView: View {
    public init() {}
    public var body: some View {
        VStack {
            Image(systemName: "house")
                .font(.system(size: 50))
                .padding()
            Text("Home")
                .font(.title)
        }
    }
}

public struct SearchView: View {
    public init() {}
    public var body: some View {
        VStack {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 50))
                .padding()
            Text("Search")
                .font(.title)
        }
    }
}

public struct LibraryView: View {
    public init() {}
    public var body: some View {
        VStack {
            Image(systemName: "folder")
                .font(.system(size: 50))
                .padding()
            Text("Library")
                .font(.title)
        }
    }
}

// SettingsView moved to Settings feature module
// public struct SettingsView: View { ... }


public struct DetailsView: View {
    let id: String
    public init(id: String) { self.id = id }
    public var body: some View {
        Text("Details for \(id)")
    }
}

public struct PlayerView: View {
    let id: String
    public init(id: String) { self.id = id }
    public var body: some View {
        Text("Playing \(id)")
    }
}

public struct ProfileView: View {
    public init() {}
    public var body: some View {
        Text("Profile")
    }
}
