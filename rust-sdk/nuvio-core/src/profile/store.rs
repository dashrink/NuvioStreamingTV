use std::fs;
use std::path::PathBuf;
use crate::error::{NuvioResult, NuvioError};
use crate::types::profile::Profile;

pub struct ProfileStore {
    pub(crate) base_path: PathBuf,
}

impl ProfileStore {
    pub fn new(base_dir: &str) -> NuvioResult<Self> {
        let base_path = PathBuf::from(base_dir).join("profiles");
        if !base_path.exists() {
            fs::create_dir_all(&base_path).map_err(|e| NuvioError::storage(e.to_string()))?;
        }
        Ok(Self { base_path })
    }

    pub fn save_profile(&self, profile: &Profile) -> NuvioResult<()> {
        let profile_dir = self.base_path.join(&profile.id);
        if !profile_dir.exists() {
            fs::create_dir_all(&profile_dir).map_err(|e| NuvioError::storage(e.to_string()))?;
        }
        
        let profile_path = profile_dir.join("profile.json");
        let content = serde_json::to_string_pretty(profile)?;
        fs::write(profile_path, content).map_err(|e| NuvioError::storage(e.to_string()))?;
        Ok(())
    }

    pub fn load_profiles(&self) -> NuvioResult<Vec<Profile>> {
        let mut profiles = Vec::new();
        if !self.base_path.exists() {
            return Ok(profiles);
        }

        for entry in fs::read_dir(&self.base_path).map_err(|e| NuvioError::storage(e.to_string()))? {
            let entry = entry.map_err(|e| NuvioError::storage(e.to_string()))?;
            let path = entry.path();
            if path.is_dir() {
                let profile_path = path.join("profile.json");
                if profile_path.exists() {
                    let content = fs::read_to_string(profile_path).map_err(|e| NuvioError::storage(e.to_string()))?;
                    let profile: Profile = serde_json::from_str(&content)?;
                    profiles.push(profile);
                }
            }
        }
        Ok(profiles)
    }

    pub fn delete_profile(&self, id: &str) -> NuvioResult<()> {
        let profile_dir = self.base_path.join(id);
        if profile_dir.exists() {
            fs::remove_dir_all(profile_dir).map_err(|e| NuvioError::storage(e.to_string()))?;
        }
        Ok(())
    }

    pub fn save_pin_hash(&self, profile_id: &str, hash: &str) -> NuvioResult<()> {
        let profile_dir = self.base_path.join(profile_id);
        if !profile_dir.exists() {
            fs::create_dir_all(&profile_dir).map_err(|e| NuvioError::storage(e.to_string()))?;
        }
        let pin_path = profile_dir.join("pin.hash");
        fs::write(pin_path, hash).map_err(|e| NuvioError::storage(e.to_string()))?;
        Ok(())
    }

    pub fn load_pin_hash(&self, profile_id: &str) -> NuvioResult<Option<String>> {
        let pin_path = self.base_path.join(profile_id).join("pin.hash");
        if pin_path.exists() {
            let hash = fs::read_to_string(pin_path).map_err(|e| NuvioError::storage(e.to_string()))?;
            Ok(Some(hash))
        } else {
            Ok(None)
        }
    }
}
