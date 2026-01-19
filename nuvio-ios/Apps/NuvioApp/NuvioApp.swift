import SwiftUI
import NuvioCore
import NuvioFeatures

@main
struct NuvioApp: App {
    @StateObject private var navigation = NavigationManager()
    @Environment(\.scenePhase) private var scenePhase
    
    init() {
        setupDependencies()
    }
    
    var body: some Scene {
        WindowGroup {
            iOSRootView()
                .environmentObject(navigation)
                .onOpenURL { url in
                    navigation.handleDeepLink(url: url)
                }
        }
    }
    
    private func setupDependencies() {
        print("Nuvio iOS App Initialized")
        
        // Initialize ProfileManager
        if let documentsDir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first {
            let baseDir = documentsDir.path
            do {
                let profileManager = try ProfileManager(baseDir: baseDir)
                DIContainer.shared.register(ProfileManager.self, service: profileManager)
                print("ProfileManager registered successfully")
            } catch {
                print("Failed to initialize ProfileManager: \(error)")
            }
        }
    }
}

struct iOSRootView: View {
    @Environment(\.horizontalSizeClass) var horizontalSizeClass
    @EnvironmentObject var navigation: NavigationManager
    
    var body: some View {
        if horizontalSizeClass == .regular {
            // iPad: Split View
            NavigationSplitView(columnVisibility: $navigation.columnVisibility) {
                List(selection: $navigation.selectedTab) {
                    NavigationLink(value: AppRoute.home) { Label("Home", systemImage: "house") }
                    NavigationLink(value: AppRoute.search) { Label("Search", systemImage: "magnifyingglass") }
                    NavigationLink(value: AppRoute.library) { Label("Library", systemImage: "folder") }
                    NavigationLink(value: AppRoute.settings) { Label("Settings", systemImage: "gear") }
                }
                .navigationTitle("Nuvio")
            } detail: {
                NavigationStack(path: $navigation.path) {
                    DestinationResolver(tab: navigation.selectedTab)
                        .navigationDestination(for: AppRoute.self) { route in
                            DestinationView(for: route)
                        }
                }
            }
        } else {
            // iPhone: Tab View + Nav Stack
            TabView(selection: $navigation.selectedTab) {
                NavigationStack(path: $navigation.path) {
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
        }
    }
}

struct DestinationResolver: View {
    let tab: AppRoute
    var body: some View {
        switch tab {
        case .home: HomeView()
        case .search: SearchView()
        case .library: LibraryView()
        case .settings: SettingsView()
        default: HomeView()
        }
    }
}
