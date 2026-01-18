pub mod auth;
pub mod client;
pub mod error;
pub mod models;
pub mod scrobble;
pub mod sync;
pub mod queue;
pub mod storage;

pub use uniffi;

use std::sync::Arc;
use tokio::runtime::Runtime;
use crate::trakt::auth::*;
use crate::trakt::client::ApiClient;
use crate::trakt::scrobble::ScrobbleManager;
use crate::trakt::sync::SyncManager;
use crate::trakt::queue::OfflineQueue;
use crate::trakt::error::TraktError;
use crate::trakt::storage::TraktStorage;

#[derive(uniffi::Record)]
pub struct TraktConfig {
    pub client_id: String,
    pub client_secret: String,
    pub redirect_uri: String,
}

#[derive(uniffi::Object)]
pub struct Trakt {
    auth_manager: Arc<AuthManager>,
    api_client: Arc<ApiClient>,
    scrobble_manager: Arc<ScrobbleManager>,
    sync_manager: Arc<SyncManager>,
    offline_queue: Arc<OfflineQueue>,
    runtime: Arc<Runtime>,
}

#[uniffi::export]
impl Trakt {
    #[uniffi::constructor]
    pub fn new(config: TraktConfig, storage: Box<dyn TraktStorage>) -> Result<Self, TraktError> {
        let runtime = Runtime::new().map_err(|e: std::io::Error| TraktError::Generic(e.to_string()))?;
        let storage: Arc<dyn TraktStorage> = Arc::from(storage);
        let auth_manager = Arc::new(AuthManager::new(
            config.client_id.clone(),
            config.client_secret,
            config.redirect_uri,
            storage.clone(),
        ));
        let api_client = Arc::new(ApiClient::new(auth_manager.clone(), config.client_id));
        let scrobble_manager = Arc::new(ScrobbleManager::new(api_client.clone()));
        let sync_manager = Arc::new(SyncManager::new(api_client.clone()));
        let offline_queue = Arc::new(OfflineQueue::new(storage));

        Ok(Self {
            auth_manager,
            api_client,
            scrobble_manager,
            sync_manager,
            offline_queue,
            runtime: Arc::new(runtime),
        })
    }

    // Auth methods
    pub fn is_authenticated(&self) -> Result<bool, TraktError> {
        self.runtime.block_on(async {
            Ok(self.auth_manager.get_access_token().await?.is_some())
        })
    }

    pub fn exchange_code(&self, code: String, code_verifier: String) -> Result<(), TraktError> {
        self.runtime.block_on(async {
            self.auth_manager.exchange_code(code, code_verifier).await
        })
    }

    pub fn request_device_code(&self) -> Result<TraktDeviceCode, TraktError> {
        self.runtime.block_on(async {
            self.auth_manager.request_device_code().await
        })
    }

    pub fn poll_device_token(&self, device_code: String) -> Result<bool, TraktError> {
        self.runtime.block_on(async {
            self.auth_manager.poll_device_token(device_code).await
        })
    }

    pub fn logout(&self) -> Result<(), TraktError> {
        self.auth_manager.logout()
    }

    pub fn scrobble(&self) -> Arc<ScrobbleManager> {
        self.scrobble_manager.clone()
    }

    pub fn sync(&self) -> Arc<SyncManager> {
        self.sync_manager.clone()
    }
}


