//! Trakt.tv storage abstraction for platform-specific storage implementations
//!
//! This module provides a trait-based storage interface that allows native platforms
//! (iOS/Android) to implement secure storage using platform-specific mechanisms like
//! iOS Keychain or Android KeyStore.
//!
//! # Platform Implementation Notes
//!
//! ## iOS
//! Use the `keyring` crate or implement using iOS Keychain directly via Swift:
//! ```swift
//! class TraktStorageImpl: TraktStorage {
//!     func saveItem(key: String, value: String) throws {
//!         let query: [String: Any] = [
//!             kSecClass as String: kSecClassGenericPassword,
//!             kSecAttrAccount as String: key,
//!             kSecValueData as String: value.data(using: .utf8)!
//!         ]
//!         SecItemDelete(query as CFDictionary)
//!         SecItemAdd(query as CFDictionary, nil)
//!     }
//!
//!     func readItem(key: String) throws -> String? {
//!         let query: [String: Any] = [
//!             kSecClass as String: kSecClassGenericPassword,
//!             kSecAttrAccount as String: key,
//!             kSecReturnData as String: true
//!         ]
//!         var result: AnyObject?
//!         let status = SecItemCopyMatching(query as CFDictionary, &result)
//!         guard status == errSecSuccess, let data = result as? Data else {
//!             return nil
//!         }
//!         return String(data: data, encoding: .utf8)
//!     }
//!
//!     func removeItem(key: String) throws {
//!         let query: [String: Any] = [
//!             kSecClass as String: kSecClassGenericPassword,
//!             kSecAttrAccount as String: key
//!         ]
//!         SecItemDelete(query as CFDictionary)
//!     }
//!
//!     func deleteAllUserData() throws {
//!         // Remove all Trakt-related items from Keychain
//!         let query: [String: Any] = [
//!             kSecClass as String: kSecClassGenericPassword
//!         ]
//!         SecItemDelete(query as CFDictionary)
//!     }
//!
//!     func exportUserData() throws -> String {
//!         // Export all stored data as JSON
//!         var exportData: [String: String] = [:]
//!         // Iterate through all Trakt keys and collect values
//!         // Return as JSON string
//!         let jsonData = try JSONSerialization.data(withJSONObject: exportData)
//!         return String(data: jsonData, encoding: .utf8) ?? "{}"
//!     }
//! }
//! ```
//!
//! ## Android
//! **WARNING**: Do NOT use the `android-keyring` crate - it is explicitly marked as
//! "not mature enough for production level or sensitive applications" by its maintainers.
//!
//! Instead, implement using Android KeyStore and EncryptedSharedPreferences via Kotlin:
//! ```kotlin
//! class TraktStorageImpl : TraktStorage {
//!     private val sharedPreferences: SharedPreferences
//!     private val masterKey: MasterKey
//!
//!     init {
//!         masterKey = MasterKey.Builder(context)
//!             .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
//!             .build()
//!
//!         sharedPreferences = EncryptedSharedPreferences.create(
//!             context,
//!             "trakt_secure_prefs",
//!             masterKey,
//!             EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
//!             EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
//!         )
//!     }
//!
//!     override fun saveItem(key: String, value: String) {
//!         sharedPreferences.edit().putString(key, value).apply()
//!     }
//!
//!     override fun readItem(key: String): String? {
//!         return sharedPreferences.getString(key, null)
//!     }
//!
//!     override fun removeItem(key: String) {
//!         sharedPreferences.edit().remove(key).apply()
//!     }
//!
//!     override fun deleteAllUserData() {
//!         sharedPreferences.edit().clear().apply()
//!     }
//!
//!     override fun exportUserData(): String {
//!         val allData = sharedPreferences.all
//!         val jsonObject = JSONObject(allData)
//!         return jsonObject.toString()
//!     }
//! }
//! ```

/// Platform-agnostic storage interface for Trakt data
///
/// This trait must be implemented by native platforms (iOS/Android) to provide
/// secure storage for OAuth tokens, offline queue data, and other Trakt-related
/// information. Implementations should use platform-specific secure storage mechanisms.
///
/// # Security Considerations
///
/// - **OAuth Tokens**: Must be stored securely (iOS Keychain, Android KeyStore)
/// - **Encryption**: All sensitive data should be encrypted at rest
/// - **Access Control**: Storage should be protected by device authentication
/// - **Data Isolation**: Trakt data should be isolated from other app data
///
/// # GDPR Compliance
///
/// This trait includes methods for GDPR compliance:
/// - `delete_all_user_data()`: Complete removal of all user data (Right to Erasure)
/// - `export_user_data()`: Export all user data in JSON format (Right to Data Portability)
///
/// # Error Handling
///
/// All methods return `Result<T, TraktError>` where the error should contain
/// a human-readable description of what went wrong. This allows native platforms
/// to provide context-specific error messages.
#[uniffi::export(callback_interface)]
pub trait TraktStorage: Send + Sync {
    /// Save a key-value pair to storage
    ///
    /// # Parameters
    /// - `key`: Unique identifier for the data (e.g., "oauth_tokens", "offline_queue")
    /// - `value`: Data to store (typically JSON-serialized string)
    ///
    /// # Returns
    /// - `Ok(())`: Data successfully saved
    /// - `Err(TraktError)`: Error if save failed
    ///
    /// # Example
    /// ```ignore
    /// storage.save_item("oauth_tokens".to_string(), tokens_json)?;
    /// ```
    fn save_item(&self, key: String, value: String) -> Result<(), crate::trakt::TraktError>;

    /// Read a value from storage by key
    ///
    /// # Parameters
    /// - `key`: Unique identifier for the data
    ///
    /// # Returns
    /// - `Ok(Some(value))`: Data found and returned
    /// - `Ok(None)`: No data found for this key
    /// - `Err(TraktError)`: Error if read failed
    ///
    /// # Example
    /// ```ignore
    /// if let Some(tokens_json) = storage.read_item("oauth_tokens"))? {
    ///     // Parse and use tokens
    /// }
    /// ```
    fn read_item(&self, key: String) -> Result<Option<String>, crate::trakt::TraktError>;

    /// Remove a key-value pair from storage
    ///
    /// # Parameters
    /// - `key`: Unique identifier for the data to remove
    ///
    /// # Returns
    /// - `Ok(())`: Data successfully removed (or didn't exist)
    /// - `Err(TraktError)`: Error if removal failed
    ///
    /// # Example
    /// ```ignore
    /// storage.remove_item("oauth_tokens"))?;
    /// ```
    fn remove_item(&self, key: String) -> Result<(), crate::trakt::TraktError>;

    /// Delete all user data from storage (GDPR Right to Erasure)
    ///
    /// This method implements the GDPR "Right to Erasure" (Article 17).
    /// It must completely and irreversibly delete all Trakt-related user data,
    /// including but not limited to:
    /// - OAuth access tokens and refresh tokens
    /// - Offline queue data
    /// - Cached API responses
    /// - User preferences and settings
    /// - Any other user-specific data
    ///
    /// # Returns
    /// - `Ok(())`: All data successfully deleted
    /// - `Err(TraktError)`: Error if deletion failed
    ///
    /// # Implementation Notes
    /// - This operation is irreversible - there is no undo
    /// - Platform implementations should clear all Trakt-prefixed keys
    /// - Consider logging this action for audit purposes
    /// - User should be logged out after this operation
    ///
    /// # Security
    /// - Ensure cryptographic erasure where possible
    /// - On iOS: Remove all items from Keychain with Trakt-related keys
    /// - On Android: Clear EncryptedSharedPreferences completely
    ///
    /// # Example (Rust caller)
    /// ```ignore
    /// // User requested account deletion
    /// storage.delete_all_user_data()?;
    /// // User is now logged out with no local data remaining
    /// ```
    fn delete_all_user_data(&self) -> Result<(), crate::trakt::TraktError>;

    /// Export all user data as JSON (GDPR Right to Data Portability)
    ///
    /// This method implements the GDPR "Right to Data Portability" (Article 20).
    /// It must export all Trakt-related user data in a structured, commonly used,
    /// machine-readable format (JSON).
    ///
    /// # Returns
    /// - `Ok(String)`: JSON string containing all user data
    /// - `Err(TraktError)`: Error if export failed
    ///
    /// # JSON Format
    /// The returned JSON should be a single object with all stored keys:
    /// ```json
    /// {
    ///   "oauth_tokens": "{\"access_token\":\"...\",\"refresh_token\":\"...\"}",
    ///   "offline_queue": "[...]",
    ///   "user_settings": "{...}"
    /// }
    /// ```
    ///
    /// # Implementation Notes
    /// - Include all Trakt-related keys and their values
    /// - Values are typically JSON strings themselves (nested JSON)
    /// - If no data exists, return an empty object: `"{}"`
    /// - Sensitive tokens should be included (user requested export)
    ///
    /// # Privacy
    /// - The exported data contains sensitive information (OAuth tokens)
    /// - Platform should warn user before exporting
    /// - Consider encrypting the export or requiring authentication
    ///
    /// # Example (Rust caller)
    /// ```ignore
    /// // User requested data export
    /// let user_data_json = storage.export_user_data()?;
    /// // Save to file or send to user via email
    /// ```
    fn export_user_data(&self) -> Result<String, crate::trakt::TraktError>;
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::trakt::TraktError;
    use std::collections::HashMap;
    use std::sync::Mutex;

    /// Mock storage implementation for testing
    struct MockStorage {
        data: Mutex<HashMap<String, String>>,
    }

    impl MockStorage {
        fn new() -> Self {
            Self {
                data: Mutex::new(HashMap::new()),
            }
        }
    }

    impl TraktStorage for MockStorage {
        fn save_item(&self, key: String, value: String) -> Result<(), TraktError> {
            self.data.lock().unwrap().insert(key, value);
            Ok(())
        }

        fn read_item(&self, key: String) -> Result<Option<String>, TraktError> {
            Ok(self.data.lock().unwrap().get(&key).cloned())
        }

        fn remove_item(&self, key: String) -> Result<(), TraktError> {
            self.data.lock().unwrap().remove(&key);
            Ok(())
        }

        fn delete_all_user_data(&self) -> Result<(), TraktError> {
            self.data.lock().unwrap().clear();
            Ok(())
        }

        fn export_user_data(&self) -> Result<String, TraktError> {
            let data = self.data.lock().unwrap();
            let json = serde_json::to_string(&*data)
                .map_err(|e| TraktError::storage(format!("Failed to serialize data: {}", e)))?;
            Ok(json)
        }
    }

    #[test]
    fn test_save_and_read_item() {
        let storage = MockStorage::new();

        storage
            .save_item("test_key".to_string(), "test_value".to_string())
            .unwrap();
        let value = storage.read_item("test_key".to_string()).unwrap();

        assert_eq!(value, Some("test_value".to_string()));
    }

    #[test]
    fn test_read_nonexistent_item() {
        let storage = MockStorage::new();

        let value = storage.read_item("nonexistent".to_string()).unwrap();

        assert_eq!(value, None);
    }

    #[test]
    fn test_remove_item() {
        let storage = MockStorage::new();

        storage
            .save_item("test_key".to_string(), "test_value".to_string())
            .unwrap();
        storage.remove_item("test_key".to_string()).unwrap();
        let value = storage.read_item("test_key".to_string()).unwrap();

        assert_eq!(value, None);
    }

    #[test]
    fn test_delete_all_user_data() {
        let storage = MockStorage::new();

        // Add multiple items
        storage
            .save_item("key1".to_string(), "value1".to_string())
            .unwrap();
        storage
            .save_item("key2".to_string(), "value2".to_string())
            .unwrap();
        storage
            .save_item("key3".to_string(), "value3".to_string())
            .unwrap();

        // Delete all
        storage.delete_all_user_data().unwrap();

        // Verify all items are gone
        assert_eq!(storage.read_item("key1".to_string()).unwrap(), None);
        assert_eq!(storage.read_item("key2".to_string()).unwrap(), None);
        assert_eq!(storage.read_item("key3".to_string()).unwrap(), None);
    }

    #[test]
    fn test_export_user_data_empty() {
        let storage = MockStorage::new();

        let json = storage.export_user_data().unwrap();

        assert_eq!(json, "{}");
    }

    #[test]
    fn test_export_user_data_with_items() {
        let storage = MockStorage::new();

        storage
            .save_item(
                "oauth_tokens".to_string(),
                "{\"access_token\":\"abc123\"}".to_string(),
            )
            .unwrap();
        storage
            .save_item(
                "user_settings".to_string(),
                "{\"theme\":\"dark\"}".to_string(),
            )
            .unwrap();

        let json = storage.export_user_data().unwrap();

        // Parse JSON to verify it's valid
        let parsed: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert!(parsed.is_object());
        assert_eq!(parsed.as_object().unwrap().len(), 2);
        assert!(parsed.get("oauth_tokens").is_some());
        assert!(parsed.get("user_settings").is_some());
    }

    #[test]
    fn test_export_after_delete() {
        let storage = MockStorage::new();

        storage
            .save_item("key1".to_string(), "value1".to_string())
            .unwrap();
        storage.delete_all_user_data().unwrap();

        let json = storage.export_user_data().unwrap();

        assert_eq!(json, "{}");
    }

    #[test]
    fn test_gdpr_compliance_workflow() {
        let storage = MockStorage::new();

        // User uses the app - data is stored
        storage
            .save_item(
                "oauth_tokens".to_string(),
                "{\"access_token\":\"xyz789\"}".to_string(),
            )
            .unwrap();
        storage
            .save_item("offline_queue".to_string(), "[]".to_string())
            .unwrap();

        // User requests data export (GDPR Article 20)
        let export = storage.export_user_data().unwrap();
        assert!(export.contains("oauth_tokens"));
        assert!(export.contains("offline_queue"));

        // User requests account deletion (GDPR Article 17)
        storage.delete_all_user_data().unwrap();

        // Verify all data is gone
        assert_eq!(storage.read_item("oauth_tokens".to_string()).unwrap(), None);
        assert_eq!(
            storage.read_item("offline_queue".to_string()).unwrap(),
            None
        );

        // Export should return empty object
        let empty_export = storage.export_user_data().unwrap();
        assert_eq!(empty_export, "{}");
    }
}
