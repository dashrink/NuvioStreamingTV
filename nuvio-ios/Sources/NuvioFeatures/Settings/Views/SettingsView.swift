import SwiftUI
import NuvioCore

public struct SettingsView: View {
    @StateObject private var viewModel = SettingsViewModel()
    
    public init() {}
    
    public var body: some View {
        Form {
            Section {
                NavigationLink(destination: ProfileManagementView(viewModel: viewModel)) {
                    HStack {
                        if let profile = viewModel.activeProfile {
                            // Avatar placeholder
                            Circle()
                                .fill(Color.blue)
                                .frame(width: 40, height: 40)
                                .overlay(Text(profile.name.prefix(1)).foregroundColor(.white))
                            
                            VStack(alignment: .leading) {
                                Text(profile.name)
                                    .font(.headline)
                                Text(profile.isPinProtected ? "PIN Protected" : "No PIN")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        } else {
                            Text("No Active Profile")
                        }
                    }
                }
            } header: {
                Text("Profile")
            }
            
            Section {
                NavigationLink(destination: GeneralSettingsView(viewModel: viewModel)) {
                    Label("General", systemImage: "gearshape")
                }
                NavigationLink(destination: ThemeSettingsView()) {
                    Label("Theme", systemImage: "paintbrush")
                }
            } header: {
                Text("App")
            }
            
            Section {
                NavigationLink(destination: PlayerSettingsView(viewModel: viewModel)) {
                    Label("Player", systemImage: "play.tv")
                }
                NavigationLink(destination: SubtitleSettingsView(viewModel: viewModel)) {
                    Label("Subtitles", systemImage: "captions.bubble")
                }
                NavigationLink(destination: AudioSettingsView()) {
                    Label("Audio", systemImage: "speaker.wave.2")
                }
                NavigationLink(destination: QualitySettingsView(viewModel: viewModel)) {
                    Label("Quality & Bandwidth", systemImage: "wifi")
                }
            } header: {
                Text("Playback")
            }
            
            Section {
                NavigationLink(destination: TraktSettingsView()) {
                    Label("Trakt.tv", systemImage: "tv")
                }
                NavigationLink(destination: TMDBSettingsView()) {
                    Label("TMDB", systemImage: "film")
                }
                NavigationLink(destination: AddonsSettingsView()) {
                    Label("Addons", systemImage: "puzzlepiece")
                }
            } header: {
                Text("Services")
            }
            
            Section {
                NavigationLink(destination: ParentalControlSettingsView(viewModel: viewModel)) {
                    Label("Parental Controls", systemImage: "lock")
                }
                NavigationLink(destination: BackupSettingsView()) {
                    Label("Backup & Restore", systemImage: "externaldrive")
                }
            } header: {
                Text("System")
            }
            
            Section {
                NavigationLink(destination: AboutView()) {
                    Label("About", systemImage: "info.circle")
                }
            }
        }
        .navigationTitle("Settings")
        .refreshable {
            await viewModel.loadData()
        }
    }
}
