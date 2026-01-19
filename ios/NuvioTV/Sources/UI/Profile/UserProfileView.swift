import SwiftUI

public struct UserProfileView: View {
    @StateObject private var viewModel: ProfileViewModel
    @State private var showingAddProfile = false
    @State private var newProfileName = ""
    @State private var newProfilePin = ""
    
    public init(viewModel: ProfileViewModel = ProfileViewModel()) {
        _viewModel = StateObject(wrappedValue: viewModel)
    }
    
    public var body: some View {
        NavigationView {
            ZStack {
                Color.black.edgesIgnoringSafeArea(.all)
                
                VStack {
                    Text("Who's Watching?")
                        .font(.title)
                        .foregroundColor(.white)
                        .padding(.top, 40)
                    
                    ScrollView {
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 150))], spacing: 20) {
                            ForEach(viewModel.profiles, id: \.id) { profile in
                                ProfileCard(profile: profile) {
                                    handleProfileSelection(profile)
                                }
                            }
                            
                            Button(action: {
                                showingAddProfile = true
                            }) {
                                VStack {
                                    Circle()
                                        .stroke(Color.gray, lineWidth: 2)
                                        .frame(width: 100, height: 100)
                                        .overlay(
                                            Image(systemName: "plus")
                                                .font(.largeTitle)
                                                .foregroundColor(.gray)
                                        )
                                    Text("Add Profile")
                                        .foregroundColor(.gray)
                                }
                            }
                            .buttonStyle(PlainButtonStyle())
                        }
                        .padding()
                    }
                }
                
                if viewModel.isPinEntryVisible {
                    ProfilePinView(viewModel: viewModel)
                }
            }
            .sheet(isPresented: $showingAddProfile) {
                AddProfileView(isPresented: $showingAddProfile, name: $newProfileName, pin: $newProfilePin) {
                    viewModel.createProfile(name: newProfileName, pin: newProfilePin.isEmpty ? nil : newProfilePin)
                    newProfileName = ""
                    newProfilePin = ""
                }
            }
        }
    }
    
    private func handleProfileSelection(_ profile: Profile) {
        viewModel.requestSwitch(to: profile)
    }
}

struct ProfileCard: View {
    let profile: Profile
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack {
                // Placeholder Avatar
                Circle()
                    .fill(Color.blue)
                    .frame(width: 100, height: 100)
                    .overlay(
                        Text(String(profile.name.prefix(1)))
                            .font(.largeTitle)
                            .foregroundColor(.white)
                    )
                
                Text(profile.name)
                    .foregroundColor(.white)
                    .font(.headline)
            }
        }
        .buttonStyle(CardButtonStyle())
    }
}

struct CardButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
            .opacity(configuration.isPressed ? 0.8 : 1.0)
    }
}

struct AddProfileView: View {
    @Binding var isPresented: Bool
    @Binding var name: String
    @Binding var pin: String
    var onSave: () -> Void
    
    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Profile Info")) {
                    TextField("Name", text: $name)
                    SecureField("PIN (Optional)", text: $pin)
                        .keyboardType(.numberPad)
                }
                
                Button("Save") {
                    onSave()
                    isPresented = false
                }
                .disabled(name.isEmpty)
            }
            .navigationTitle("Add Profile")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        isPresented = false
                    }
                }
            }
        }
    }
}
