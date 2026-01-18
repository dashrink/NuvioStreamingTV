use std::sync::{Arc, Mutex};
use crate::error::{NuvioResult, NuvioError};
use crate::types::profile::*;
use crate::profile::store::ProfileStore;
use crate::profile::security::SecurityManager;
use uuid::Uuid;
use chrono::Utc;

#[derive(uniffi::Object)]
pub struct ProfileManager {
    store: ProfileStore,
    active_profile_id: Mutex<Option<String>>,
}

#[uniffi::export]
impl ProfileManager {
    #[uniffi::constructor]
    pub fn new(base_dir: String) -> NuvioResult<Arc<Self>> {
        let store = ProfileStore::new(&base_dir)?;
        Ok(Arc::new(Self {
            store,
            active_profile_id: Mutex::new(None),
        }))
    }

    pub fn get_profiles(&self) -> NuvioResult<Vec<Profile>> {
        self.store.load_profiles()
    }

    pub fn create_profile(&self, input: CreateProfileInput) -> NuvioResult<Profile> {
        let profiles = self.get_profiles()?;
        if profiles.len() >= 5 {
            return Err(NuvioError::profile("Maximum number of profiles reached"));
        }

        let now = Utc::now().timestamp();
        let id = Uuid::new_v4().to_string();
        
        // Initial preferences
        let preferences = ProfilePreferences {
            language: "en".to_string(),
            subtitles_enabled: true,
            subtitle_styling: "{}".to_string(),
            autoplay_next: true,
            quality_preference: "Auto".to_string(),
        };

        let is_admin = profiles.is_empty() || input.profile_type == ProfileType::Admin;

        let profile = Profile {
            id: id.clone(),
            name: input.name,
            profile_type: input.profile_type,
            avatar_id: input.avatar_id.unwrap_or_else(|| "default".to_string()),
            max_age_rating: input.max_age_rating.unwrap_or_else(|| "R".to_string()),
            is_pin_protected: input.pin.is_some(),
            is_admin,
            preferences,
            created_at: now,
            updated_at: now,
        };

        if let Some(pin) = input.pin {
            let hashed_pin = SecurityManager::hash_pin(&pin)?;
            self.store.save_pin_hash(&id, &hashed_pin)?;
        }

        self.store.save_profile(&profile)?;
        
        // If first profile, set as active
        if profiles.is_empty() {
            let mut active_id = self.active_profile_id.lock().unwrap();
            *active_id = Some(id);
        }

        Ok(profile)
    }

    pub fn update_profile(&self, id: &str, input: UpdateProfileInput) -> NuvioResult<Profile> {
        let mut profiles = self.get_profiles()?;
        let profile = profiles.iter_mut().find(|p| p.id == id)
            .ok_or_else(|| NuvioError::profile("Profile not found"))?;

        if let Some(name) = input.name {
            profile.name = name;
        }
        if let Some(avatar_id) = input.avatar_id {
            profile.avatar_id = avatar_id;
        }
        if let Some(max_age_rating) = input.max_age_rating {
            profile.max_age_rating = max_age_rating;
        }
        if let Some(prefs) = input.preferences {
            profile.preferences = prefs;
        }

        profile.updated_at = Utc::now().timestamp();
        self.store.save_profile(profile)?;
        
        Ok(profile.clone())
    }

    pub fn set_pin(&self, id: &str, pin: &str) -> NuvioResult<()> {
        let mut profiles = self.get_profiles()?;
        let profile = profiles.iter_mut().find(|p| p.id == id)
            .ok_or_else(|| NuvioError::profile("Profile not found"))?;

        let hashed_pin = SecurityManager::hash_pin(pin)?;
        self.store.save_pin_hash(id, &hashed_pin)?;
        
        profile.is_pin_protected = true;
        profile.updated_at = Utc::now().timestamp();
        self.store.save_profile(profile)?;
        
        Ok(())
    }

    pub fn verify_pin(&self, id: &str, pin: &str) -> NuvioResult<bool> {
        let hash = self.store.load_pin_hash(id)?
            .ok_or_else(|| NuvioError::profile("Profile has no PIN set"))?;
            
        SecurityManager::verify_pin(pin, &hash)
    }

    pub fn delete_profile(&self, id: &str) -> NuvioResult<()> {
        let profiles = self.get_profiles()?;
        if profiles.len() <= 1 {
            return Err(NuvioError::profile("Cannot delete the only profile"));
        }

        let profile = profiles.iter().find(|p| p.id == id)
            .ok_or_else(|| NuvioError::profile("Profile not found"))?;

        if profile.is_admin {
            // Check if there are other admins
            let other_admins = profiles.iter().filter(|p| p.id != id && p.is_admin).count();
            if other_admins == 0 {
                return Err(NuvioError::profile("Cannot delete the last admin profile"));
            }
        }

        self.store.delete_profile(id)?;
        
        let mut active_id = self.active_profile_id.lock().unwrap();
        if active_id.as_ref() == Some(&id.to_string()) {
            *active_id = None;
        }
        
        Ok(())
    }

    pub fn switch_profile(&self, id: &str) -> NuvioResult<()> {
        let profiles = self.get_profiles()?;
        if !profiles.iter().any(|p| p.id == id) {
            return Err(NuvioError::profile("Profile not found"));
        }
        
        let mut active_id = self.active_profile_id.lock().unwrap();
        *active_id = Some(id.to_string());
        Ok(())
    }

    pub fn get_active_profile(&self) -> NuvioResult<Option<Profile>> {
        let active_id = self.active_profile_id.lock().unwrap();
        match active_id.as_ref() {
            Some(id) => {
                let profiles = self.get_profiles()?;
                Ok(profiles.into_iter().find(|p| &p.id == id))
            }
            None => Ok(None),
        }
    }

    pub fn get_watched_history(&self, profile_id: &str) -> NuvioResult<Vec<WatchedItem>> {
        let history_path = self.store.base_path.join(profile_id).join("history.json");
        if !history_path.exists() {
            return Ok(Vec::new());
        }
        let content = std::fs::read_to_string(history_path).map_err(|e| NuvioError::storage(e.to_string()))?;
        let history: Vec<WatchedItem> = serde_json::from_str(&content)?;
        Ok(history)
    }

    pub fn update_watched_item(&self, profile_id: &str, item: WatchedItem) -> NuvioResult<()> {
        let mut history = self.get_watched_history(profile_id)?;
        if let Some(existing) = history.iter_mut().find(|i| i.id == item.id) {
            *existing = item;
        } else {
            history.push(item);
        }
        
        let history_path = self.store.base_path.join(profile_id).join("history.json");
        let content = serde_json::to_string_pretty(&history)?;
        std::fs::write(history_path, content).map_err(|e| NuvioError::storage(e.to_string()))?;
        Ok(())
    }

    pub fn export_profiles(&self) -> NuvioResult<String> {
        let profiles = self.get_profiles()?;
        let mut export_data = serde_json::Value::Object(serde_json::Map::new());
        let mut profiles_vec = Vec::new();
        
        for profile in profiles {
            let mut p_val = serde_json::to_value(&profile)?;
            let pin_hash = self.store.load_pin_hash(&profile.id)?;
            if let Some(hash) = pin_hash {
                p_val.as_object_mut().unwrap().insert("pin_hash".to_string(), serde_json::Value::String(hash));
            }
            let history = self.get_watched_history(&profile.id)?;
            p_val.as_object_mut().unwrap().insert("history".to_string(), serde_json::to_value(history)?);
            profiles_vec.push(p_val);
        }
        
        export_data.as_object_mut().unwrap().insert("profiles".to_string(), serde_json::Value::Array(profiles_vec));
        Ok(serde_json::to_string(&export_data)?)
    }

    pub fn import_profiles(&self, json: &str) -> NuvioResult<()> {
        let data: serde_json::Value = serde_json::from_str(json)?;
        let profiles = data.get("profiles").and_then(|v| v.as_array())
            .ok_or_else(|| NuvioError::validation("Invalid export format"))?;
            
        for p_val in profiles {
            let profile: Profile = serde_json::from_value(p_val.clone())?;
            self.store.save_profile(&profile)?;
            
            if let Some(hash) = p_val.get("pin_hash").and_then(|v| v.as_str()) {
                self.store.save_pin_hash(&profile.id, hash)?;
            }
            
            if let Some(history_val) = p_val.get("history") {
                let history: Vec<WatchedItem> = serde_json::from_value(history_val.clone())?;
                let history_path = self.store.base_path.join(&profile.id).join("history.json");
                let content = serde_json::to_string_pretty(&history)?;
                std::fs::write(history_path, content).map_err(|e| NuvioError::storage(e.to_string()))?;
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_profile_lifecycle() -> NuvioResult<()> {
        let dir = tempdir().map_err(|e| NuvioError::storage(e.to_string()))?;
        let base_dir = dir.path().to_str().unwrap().to_string();
        let manager = ProfileManager::new(base_dir)?;

        // Create first profile (admin)
        let profile1 = manager.create_profile(CreateProfileInput {
            name: "Admin".to_string(),
            profile_type: ProfileType::Admin,
            avatar_id: None,
            max_age_rating: None,
            pin: Some("1234".to_string()),
        })?;

        assert_eq!(profile1.name, "Admin");
        assert!(profile1.is_admin);
        assert!(profile1.is_pin_protected);

        // Verify PIN
        assert!(manager.verify_pin(&profile1.id, "1234")?);
        assert!(!manager.verify_pin(&profile1.id, "wrong")?);

        // Switch profile
        manager.switch_profile(&profile1.id)?;
        let active = manager.get_active_profile()?;
        assert!(active.is_some());
        assert_eq!(active.unwrap().id, profile1.id);

        // Create second profile
        let profile2 = manager.create_profile(CreateProfileInput {
            name: "Kids".to_string(),
            profile_type: ProfileType::Kids,
            avatar_id: None,
            max_age_rating: Some("G".to_string()),
            pin: None,
        })?;

        assert_eq!(profile2.profile_type, ProfileType::Kids);
        assert!(!profile2.is_admin);

        let profiles = manager.get_profiles()?;
        assert_eq!(profiles.len(), 2);

        // Update profile
        manager.update_profile(&profile2.id, UpdateProfileInput {
            name: Some("New Kids".to_string()),
            avatar_id: None,
            max_age_rating: None,
            preferences: None,
        })?;

        let updated = manager.get_profiles()?.into_iter().find(|p| p.id == profile2.id).unwrap();
        assert_eq!(updated.name, "New Kids");

        // Watched history
        let item = WatchedItem {
            id: "movie1".to_string(),
            title: "Movie 1".to_string(),
            poster: "poster.jpg".to_string(),
            progress: 0.5,
            duration: 120.0,
            last_watched_at: Utc::now().timestamp(),
        };
        manager.update_watched_item(&profile1.id, item.clone())?;
        let history = manager.get_watched_history(&profile1.id)?;
        assert_eq!(history.len(), 1);
        assert_eq!(history[0].id, "movie1");

        // Export/Import
        let export = manager.export_profiles()?;
        assert!(export.contains("Admin"));
        assert!(export.contains("New Kids"));

        let dir2 = tempdir().map_err(|e| NuvioError::storage(e.to_string()))?;
        let manager2 = ProfileManager::new(dir2.path().to_str().unwrap().to_string())?;
        manager2.import_profiles(&export)?;
        let profiles2 = manager2.get_profiles()?;
        assert_eq!(profiles2.len(), 2);
        assert!(profiles2.iter().any(|p| p.name == "Admin"));

        // Delete profile
        manager.delete_profile(&profile2.id)?;
        assert_eq!(manager.get_profiles()?.len(), 1);

        Ok(())
    }
}
