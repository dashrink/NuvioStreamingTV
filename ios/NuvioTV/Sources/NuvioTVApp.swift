//
//  NuvioTVApp.swift
//  NuvioTV
//
//  Created by Claude Code
//  Main SwiftUI app entry point
//

import SwiftUI

@main
struct NuvioTVApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

/// Main content view - entry point for the app
struct ContentView: View {
    var body: some View {
        CatalogBrowseView(repository: MockCatalogRepository()) { contentId in
            print("Content clicked: \(contentId)")
            // In production, this would navigate to details screen
        }
    }
}
