import SwiftUI
import NuvioCore

struct ProfileManagementView: View {
    @ObservedObject var viewModel: SettingsViewModel
    @State private var showingAddProfile = false
    
    var body: some View {
        List {
            Section(header: Text("Switch Profile")) {
                ForEach(viewModel.profiles, id: \.id) { profile in
                    Button(action: {
                        // Switch profile logic
                        // In a real app this would trigger a switch
                    }) {
                        HStack {
                            Circle()
                                .fill(Color.gray)
                                .frame(width: 32, height: 32)
                                .overlay(Text(profile.name.prefix(1)).foregroundColor(.white))
                            
                            Text(profile.name)
                                .foregroundColor(.primary)
                            
                            Spacer()
                            
                            if viewModel.activeProfile?.id == profile.id {
                                Image(systemName: "checkmark")
                                    .foregroundColor(.blue)
                            }
                        }
                    }
                }
                
                Button(action: { showingAddProfile = true }) {
                    Label("Add Profile", systemImage: "plus")
                }
            }
            
            Section(header: Text("Current Profile Settings")) {
                if let profile = viewModel.activeProfile {
                    NavigationLink("Edit Profile") {
                        EditProfileView(profile: profile)
                    }
                }
            }
        }
        .navigationTitle("Profiles")
        .sheet(isPresented: $showingAddProfile) {
            Text("Add Profile Sheet")
        }
    }
}

struct EditProfileView: View {
    let profile: Profile
    @State private var name: String
    
    init(profile: Profile) {
        self.profile = profile
        _name = State(initialValue: profile.name)
    }
    
    var body: some View {
        Form {
            Section("Info") {
                TextField("Name", text: $name)
            }
            
            Section("Restrictions") {
                Toggle("PIN Protection", isOn: .constant(profile.isPinProtected))
                Text("Max Rating: \(profile.maxAgeRating)")
            }
        }
        .navigationTitle("Edit Profile")
    }
}
