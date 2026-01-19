import Foundation
import Combine
import NuvioCore

@MainActor
public class SettingsViewModel: ObservableObject {
    @Published public var profiles: [Profile] = []
    @Published public var activeProfile: Profile?
    @Published public var isLoading: Bool = false
    @Published public var error: String?
    
    // We keep a reference to the ProfileManager
    private var profileManager: ProfileManager?
    
    public init() {
        self.profileManager = DIContainer.shared.resolve(ProfileManager.self)
        Task {
            await loadData()
        }
    }
    
    public func loadData() async {
        guard let manager = profileManager else {
            self.error = "Profile Manager not initialized"
            return
        }
        
        self.isLoading = true
        defer { self.isLoading = false }
        
        do {
            self.profiles = try manager.getProfiles()
            self.activeProfile = try manager.getActiveProfile()
        } catch {
            self.error = error.localizedDescription
        }
    }
    
    public func updateProfilePreferences(_ preferences: ProfilePreferences) async {
        guard let manager = profileManager, let profile = activeProfile else { return }
        
        do {
            // Create an update input with the new preferences
            // Note: UpdateProfileInput struct must be defined in the Rust bindings or NuvioCore
            let input = UpdateProfileInput(
                name: nil,
                avatarId: nil,
                maxAgeRating: nil,
                preferences: preferences
            )
            
            let updatedProfile = try manager.updateProfile(id: profile.id, input: input)
            self.activeProfile = updatedProfile
            
            // Update the profile in the list as well
            if let index = self.profiles.firstIndex(where: { $0.id == updatedProfile.id }) {
                self.profiles[index] = updatedProfile
            }
        } catch {
            self.error = error.localizedDescription
        }
    }
    
    // Helper to get current preferences or default
    public var currentPreferences: ProfilePreferences {
        activeProfile?.preferences ?? ProfilePreferences(
            language: "en",
            subtitlesEnabled: true,
            subtitleStyling: "{}",
            autoplayNext: true,
            qualityPreference: "Auto"
        )
    }
}
