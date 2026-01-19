import SwiftUI
import NuvioCore
import NuvioFeatures

@main
struct NuvioTVApp: App {
    @StateObject private var navigation = NavigationManager()
    
    init() {
        setupDependencies()
    }
    
    var body: some Scene {
        WindowGroup {
            TVRootView()
                .environmentObject(navigation)
        }
    }
    
    private func setupDependencies() {
        print("Nuvio TV App Initialized")
    }
}

struct TVRootView: View {
    @EnvironmentObject var navigation: NavigationManager
    // tvOS Focus Engine: Managing focus across tabs
    @FocusState private var focusedTab: AppRoute?
    
    var body: some View {
        TabView(selection: $navigation.selectedTab) {
            NavigationStack {
                HomeView()
                    .navigationDestination(for: AppRoute.self) { route in
                        DestinationView(for: route)
                    }
            }
            .tabItem { Label("Home", systemImage: "house") }
            .tag(AppRoute.home)
            
            NavigationStack {
                SearchView()
                    .navigationDestination(for: AppRoute.self) { route in
                        DestinationView(for: route)
                    }
            }
            .tabItem { Label("Search", systemImage: "magnifyingglass") }
            .tag(AppRoute.search)
            
            NavigationStack {
                LibraryView()
                    .navigationDestination(for: AppRoute.self) { route in
                        DestinationView(for: route)
                    }
            }
            .tabItem { Label("Library", systemImage: "folder") }
            .tag(AppRoute.library)
            
            NavigationStack {
                SettingsView()
                    .navigationDestination(for: AppRoute.self) { route in
                        DestinationView(for: route)
                    }
            }
            .tabItem { Label("Settings", systemImage: "gear") }
            .tag(AppRoute.settings)
        }
        // tvOS Focus Behavior: Reset focus to Home on launch if needed
        // In SwiftUI, .defaultFocus is used for this
        // .defaultFocus($focusedTab, .home) // Requires AppRoute to match the FocusState type which it does, but FocusState is usually for specific view elements, not tabs directly. 
        // For TabView, selection binding handles the "focus" of the tab.
    }
}
