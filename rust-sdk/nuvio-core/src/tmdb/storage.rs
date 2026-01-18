use crate::tmdb::error::TmdbError;

#[uniffi::export(callback_interface)]
pub trait TmdbStorage: Send + Sync {
    fn save_item(&self, key: String, value: String, timestamp: i64) -> Result<(), TmdbError>;
    fn read_item(&self, key: String) -> Result<Option<String>, TmdbError>;
    fn remove_item(&self, key: String) -> Result<(), TmdbError>;
}
