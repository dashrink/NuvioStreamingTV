import SwiftUI
import NuvioCore

struct ParentalControlSettingsView: View {
    @ObservedObject var viewModel: SettingsViewModel
    @State private var pin: String = ""
    
    var body: some View {
        Form {
            Section {
                if let profile = viewModel.activeProfile {
                    if profile.isPinProtected {
                        Button("Change PIN") {
                            // Show PIN change sheet
                        }
                        Button("Remove PIN", role: .destructive) {
                            // Remove PIN logic
                        }
                    } else {
                        Button("Set PIN") {
                            // Show Set PIN sheet
                        }
                    }
                }
            }
            
            Section {
                NavigationLink("Rating Restrictions") {
                    Text("Select Max Age Rating")
                }
                Toggle("Hide Adult Content", isOn: .constant(true))
            }
        }
        .navigationTitle("Parental Controls")
    }
}

struct BackupSettingsView: View {
    var body: some View {
        Form {
            Section {
                Button("Export Settings") {
                    // Export logic
                }
                Button("Import Settings") {
                    // Import logic
                }
            } footer: {
                Text("Backup your profiles, history, and settings to a JSON file.")
            }
        }
        .navigationTitle("Backup & Restore")
    }
}

struct GeneralSettingsView: View {
    @ObservedObject var viewModel: SettingsViewModel
    
    var body: some View {
        Form {
            Section {
                Picker("Language", selection: .constant("en")) {
                    Text("English").tag("en")
                    Text("System Default").tag("system")
                }
            }
            
            Section {
                Toggle("Notifications", isOn: .constant(true))
            }
        }
        .navigationTitle("General")
    }
}

struct ThemeSettingsView: View {
    @AppStorage("appTheme") private var theme: String = "system"
    
    var body: some View {
        Form {
            Section {
                Picker("Appearance", selection: $theme) {
                    Text("System").tag("system")
                    Text("Light").tag("light")
                    Text("Dark").tag("dark")
                }
            }
            
            Section {
                NavigationLink("Accent Color") {
                    ColorPicker("Accent", selection: .constant(.blue))
                }
            }
        }
        .navigationTitle("Theme")
    }
}

struct AboutView: View {
    var body: some View {
        List {
            Section {
                HStack {
                    Text("Version")
                    Spacer()
                    Text("1.0.0 (Build 100)")
                        .foregroundColor(.secondary)
                }
                HStack {
                    Text("SDK Version")
                    Spacer()
                    Text("0.5.0")
                        .foregroundColor(.secondary)
                }
            }
            
            Section {
                Link("Privacy Policy", destination: URL(string: "https://nuvio.app/privacy")!)
                Link("Terms of Service", destination: URL(string: "https://nuvio.app/terms")!)
                Link("Website", destination: URL(string: "https://nuvio.app")!)
            }
            
            Section {
                NavigationLink("Licenses") {
                    Text("Open Source Licenses...")
                }
            }
        }
        .navigationTitle("About")
    }
}
