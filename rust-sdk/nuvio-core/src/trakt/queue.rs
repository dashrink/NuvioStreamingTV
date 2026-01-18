use crate::trakt::error::TraktError;
use crate::trakt::storage::TraktStorage;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;
// use tracing::{info, error};


#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct QueuedRequest {
    pub id: String,
    pub method: String,
    pub endpoint: String,
    pub body: Option<String>,
    pub timestamp: i64,
}

pub struct OfflineQueue {
    storage: Arc<dyn TraktStorage>,
    queue: Arc<Mutex<Vec<QueuedRequest>>>,
}

impl OfflineQueue {
    pub fn new(storage: Arc<dyn TraktStorage>) -> Self {
        Self {
            storage,
            queue: Arc::new(Mutex::new(Vec::new())),
        }
    }

    pub async fn add(&self, method: &str, endpoint: &str, body: Option<String>) -> Result<(), TraktError> {
        let mut queue = self.queue.lock().await;
        let request = QueuedRequest {
            id: uuid::Uuid::new_v4().to_string(),
            method: method.to_string(),
            endpoint: endpoint.to_string(),
            body,
            timestamp: chrono::Utc::now().timestamp(),
        };
        queue.push(request);
        self.persist(&queue).await?;
        Ok(())
    }

    pub async fn load(&self) -> Result<(), TraktError> {
        if let Some(data) = self.storage.read_item("trakt_offline_queue".to_string())? {
            let loaded: Vec<QueuedRequest> = serde_json::from_str(&data)?;
            let mut queue = self.queue.lock().await;
            *queue = loaded;
        }
        Ok(())
    }

    pub async fn pop_all(&self) -> Vec<QueuedRequest> {
        let mut queue = self.queue.lock().await;
        let items = queue.clone();
        queue.clear();
        let _ = self.persist(&queue).await;
        items
    }

    async fn persist(&self, queue: &[QueuedRequest]) -> Result<(), TraktError> {
        let serialized = serde_json::to_string(queue)?;
        self.storage.save_item("trakt_offline_queue".to_string(), serialized)?;
        Ok(())
    }
}
