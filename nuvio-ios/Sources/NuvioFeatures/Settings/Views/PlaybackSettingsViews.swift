import SwiftUI
import NuvioCore

struct PlayerSettingsView: View {
    @ObservedObject var viewModel: SettingsViewModel
    @State private var autoplayNext: Bool = true
    
    var body: some View {
        Form {
            Section {
                Toggle("Autoplay Next Episode", isOn: $autoplayNext)
                    .onChange(of: autoplayNext) { newValue in
                        updatePreferences()
                    }
            } header: {
                Text("Playback")
            }
            
            Section {
                // Seek durations
                Picker("Skip Forward", selection: .constant(30)) {
                    Text("10 seconds").tag(10)
                    Text("30 seconds").tag(30)
                }
                Picker("Skip Backward", selection: .constant(10)) {
                    Text("10 seconds").tag(10)
                    Text("30 seconds").tag(30)
                }
            } header: {
                Text("Seeking")
            }
        }
        .navigationTitle("Player Settings")
        .onAppear {
            if let prefs = viewModel.activeProfile?.preferences {
                autoplayNext = prefs.autoplayNext
            }
        }
    }
    
    private func updatePreferences() {
        var prefs = viewModel.currentPreferences
        prefs.autoplayNext = autoplayNext
        Task {
            await viewModel.updateProfilePreferences(prefs)
        }
    }
}

struct SubtitleSettingsView: View {
    @ObservedObject var viewModel: SettingsViewModel
    @State private var subtitlesEnabled: Bool = true
    
    var body: some View {
        Form {
            Section {
                Toggle("Enabled by Default", isOn: $subtitlesEnabled)
            }
            
            Section(header: Text("Appearance")) {
                NavigationLink("Font") { Text("Font Selection") }
                NavigationLink("Color") { Text("Color Selection") }
                NavigationLink("Background") { Text("Background Selection") }
            }
        }
        .navigationTitle("Subtitles")
        .onAppear {
            if let prefs = viewModel.activeProfile?.preferences {
                subtitlesEnabled = prefs.subtitlesEnabled
            }
        }
        .onChange(of: subtitlesEnabled) { newValue in
            var prefs = viewModel.currentPreferences
            prefs.subtitlesEnabled = newValue
            Task {
                await viewModel.updateProfilePreferences(prefs)
            }
        }
    }
}

struct AudioSettingsView: View {
    var body: some View {
        Form {
            Section {
                Toggle("Passthrough", isOn: .constant(false))
            } header: {
                Text("Output")
            }
            
            Section {
                Picker("Preferred Language", selection: .constant("en")) {
                    Text("English").tag("en")
                    Text("Spanish").tag("es")
                    Text("French").tag("fr")
                }
            }
        }
        .navigationTitle("Audio")
    }
}

struct QualitySettingsView: View {
    @ObservedObject var viewModel: SettingsViewModel
    @State private var quality: String = "Auto"
    
    let qualities = ["Auto", "4K", "1080p", "720p", "SD"]
    
    var body: some View {
        Form {
            Section {
                Picker("Default Quality", selection: $quality) {
                    ForEach(qualities, id: \.self) { q in
                        Text(q).tag(q)
                    }
                }
            } header: {
                Text("Streaming")
            }
            
            Section {
                Toggle("Limit Bandwidth on Cellular", isOn: .constant(true))
            }
        }
        .navigationTitle("Quality")
        .onAppear {
            if let prefs = viewModel.activeProfile?.preferences {
                quality = prefs.qualityPreference
            }
        }
        .onChange(of: quality) { newValue in
            var prefs = viewModel.currentPreferences
            prefs.qualityPreference = newValue
            Task {
                await viewModel.updateProfilePreferences(prefs)
            }
        }
    }
}
