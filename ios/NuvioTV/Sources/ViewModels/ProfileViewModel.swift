import Foundation
import Combine

@MainActor
public class ProfileViewModel: ObservableObject {
    @Published public var profiles: [Profile] = []
    @Published public var activeProfile: Profile?
    @Published public var isPinEntryVisible = false
    @Published public var pinError: String?
    @Published public var isLoading = false
    @Published public var pendingProfileId: String?
    
    private let profileManager: ProfileManager?
    
    public init(profileManager: ProfileManager? = nil) {
        if let manager = profileManager {
            self.profileManager = manager
        } else {
            // Initialize with default path if not provided
            let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].path
            do {
                self.profileManager = try ProfileManager(baseDir: documentsPath)
            } catch {
                print("Failed to initialize ProfileManager: \(error)")
                self.profileManager = nil
            }
        }
        
        loadProfiles()
        loadActiveProfile()
    }
    
    public func loadProfiles() {
        guard let manager = profileManager else { return }
        do {
            self.profiles = try manager.getProfiles()
        } catch {
            print("Failed to load profiles: \(error)")
        }
    }
    
    public func loadActiveProfile() {
        guard let manager = profileManager else { return }
        do {
            self.activeProfile = try manager.getActiveProfile()
        } catch {
            print("Failed to load active profile: \(error)")
        }
    }
    
    public func createProfile(name: String, pin: String?) {
        guard let manager = profileManager else { return }
        isLoading = true
        
        // Construct CreateProfileInput - assuming struct structure based on usage patterns
        // We need to check the actual definition of CreateProfileInput in NuvioCore.swift
        // For now, I'll guess or check the file content I read earlier.
        
        // Checking NuvioCore.swift content for CreateProfileInput...
        // It uses FfiConverterTypeCreateProfileInput_lower.
        // I need to find the definition of CreateProfileInput struct in NuvioCore.swift
        
        // Let's defer exact implementation until I verify the struct definition.
    }
    
    public func requestSwitch(to profile: Profile) {
        if profile.isPinProtected {
            self.pendingProfileId = profile.id
            self.isPinEntryVisible = true
        } else {
            switchProfile(id: profile.id, pin: nil)
        }
    }

    public func verifyAndSwitch(pin: String) {
        guard let id = pendingProfileId else { return }
        switchProfile(id: id, pin: pin)
        // Reset pending only on success? switchProfile clears it below.
    }
    
    private func switchProfile(id: String, pin: String?) {
        guard let manager = profileManager else { return }
        
        if let pin = pin, !pin.isEmpty {
            do {
                let isValid = try manager.verifyPin(id: id, pin: pin)
                if !isValid {
                    self.pinError = "Invalid PIN"
                    return
                }
            } catch {
                self.pinError = "Error verifying PIN"
                return
            }
        }
        
        do {
            try manager.switchProfile(id: id)
            loadActiveProfile()
            isPinEntryVisible = false
            pendingProfileId = nil
            pinError = nil
        } catch {
            print("Failed to switch profile: \(error)")
        }
    }
}
