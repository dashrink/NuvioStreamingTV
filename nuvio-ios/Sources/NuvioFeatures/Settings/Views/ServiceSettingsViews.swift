import SwiftUI

struct TraktSettingsView: View {
    @State private var isConnected = false
    
    var body: some View {
        Form {
            Section {
                if isConnected {
                    Button("Disconnect Trakt", role: .destructive) {
                        isConnected = false
                    }
                    Text("Logged in as user123")
                } else {
                    Button("Connect Trakt") {
                        // Trigger OAuth flow
                        isConnected = true
                    }
                }
            } header: {
                Text("Account")
            }
            
            if isConnected {
                Section {
                    Toggle("Sync History", isOn: .constant(true))
                    Toggle("Sync Watchlist", isOn: .constant(true))
                    Toggle("Scrobble", isOn: .constant(true))
                } header: {
                    Text("Sync")
                }
            }
        }
        .navigationTitle("Trakt.tv")
    }
}

struct TMDBSettingsView: View {
    @State private var apiKey: String = ""
    
    var body: some View {
        Form {
            Section {
                SecureField("API Key", text: $apiKey)
                Button("Verify Key") {
                    // Verify logic
                }
            } footer: {
                Text("Enter your TMDB API key to access metadata.")
            }
        }
        .navigationTitle("TMDB Configuration")
    }
}

struct AddonsSettingsView: View {
    var body: some View {
        List {
            Section(header: Text("Installed Addons")) {
                Text("Official TMDB Addon")
                Text("Official Trakt Addon")
            }
            
            Section(header: Text("Available Addons")) {
                NavigationLink("Browse Addons") {
                    Text("Addon Repository")
                }
            }
        }
        .navigationTitle("Addons")
    }
}
