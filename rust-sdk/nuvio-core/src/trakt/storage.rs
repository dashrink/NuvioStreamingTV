use crate::trakt::error::TraktError;

#[uniffi::export(callback_interface)]
pub trait TraktStorage: Send + Sync {
    fn save_item(&self, key: String, value: String) -> Result<(), TraktError>;
    fn read_item(&self, key: String) -> Result<Option<String>, TraktError>;
    fn remove_item(&self, key: String) -> Result<(), TraktError>;
}
