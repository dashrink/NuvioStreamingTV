use crate::trakt::error::TraktError;
use crate::trakt::storage::TraktStorage;

use oauth2::basic::{BasicClient, BasicTokenType};
use oauth2::reqwest::async_http_client;
use oauth2::{
    AuthUrl, AuthorizationCode, ClientId, ClientSecret,
    PkceCodeVerifier, RedirectUrl, RefreshToken, TokenResponse, TokenUrl, DeviceAuthorizationUrl,
    StandardTokenResponse, EmptyExtraTokenFields, EmptyExtraDeviceAuthorizationFields,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use chrono::Utc;
use tracing::{info, error};

const TRAKT_AUTH_URL: &str = "https://trakt.tv/oauth/authorize";
const TRAKT_TOKEN_URL: &str = "https://api.trakt.tv/oauth/token";
const TRAKT_DEVICE_CODE_URL: &str = "https://api.trakt.tv/oauth/device/code";

#[derive(Debug, Serialize, Deserialize)]
pub(crate) struct TraktTokens {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_at: i64,
}

#[derive(uniffi::Record)]
pub struct TraktDeviceCode {
    pub device_code: String,
    pub user_code: String,
    pub verification_url: String,
    pub expires_in: u32,
    pub interval: u32,
}

pub struct AuthManager {
    client_id: String,
    client_secret: String,
    client: BasicClient,
    storage: Arc<dyn TraktStorage>,
}

impl AuthManager {
    pub fn new(
        client_id: String,
        client_secret: String,
        redirect_uri: String,
        storage: Arc<dyn TraktStorage>,
    ) -> Self {
        let client = BasicClient::new(
            ClientId::new(client_id.clone()),
            Some(ClientSecret::new(client_secret.clone())),
            AuthUrl::new(TRAKT_AUTH_URL.to_string()).unwrap(),
            Some(TokenUrl::new(TRAKT_TOKEN_URL.to_string()).unwrap()),
        )
        .set_redirect_uri(RedirectUrl::new(redirect_uri).unwrap())
        .set_device_authorization_url(DeviceAuthorizationUrl::new(TRAKT_DEVICE_CODE_URL.to_string()).unwrap());

        Self { 
            client_id,
            client_secret,
            client, 
            storage 
        }
    }

    pub async fn exchange_code(
        &self,
        code: String,
        code_verifier: String,
    ) -> Result<(), TraktError> {
        let pkce_verifier = PkceCodeVerifier::new(code_verifier);
        
        let token_result = self
            .client
            .exchange_code(AuthorizationCode::new(code))
            .set_pkce_verifier(pkce_verifier)
            .request_async(async_http_client)
            .await
            .map_err(|e| TraktError::AuthError(format!("Failed to exchange code: {}", e)))?;

        self.save_token_response(token_result)?;
        Ok(())
    }

    pub async fn refresh_token(&self) -> Result<String, TraktError> {
        let refresh_token = self.get_refresh_token()?.ok_or_else(|| {
            TraktError::AuthError("No refresh token available".to_string())
        })?;

        let token_result = self
            .client
            .exchange_refresh_token(&RefreshToken::new(refresh_token))
            .request_async(async_http_client)
            .await
            .map_err(|e| TraktError::AuthError(format!("Failed to refresh token: {}", e)))?;

        let access_token = token_result.access_token().secret().clone();
        self.save_token_response(token_result)?;
        Ok(access_token)
    }

    pub async fn get_access_token(&self) -> Result<Option<String>, TraktError> {
        let tokens = self.load_tokens()?;
        match tokens {
            Some(t) => {
                let now = Utc::now().timestamp();
                if t.expires_at < now + 300 {
                    info!("Token expired or expiring soon, refreshing...");
                    match self.refresh_token().await {
                        Ok(new_token) => Ok(Some(new_token)),
                        Err(e) => {
                            error!("Failed to refresh token: {}", e);
                            Err(e)
                        }
                    }
                } else {
                    Ok(Some(t.access_token))
                }
            }
            None => Ok(None),
        }
    }

    pub async fn request_device_code(&self) -> Result<TraktDeviceCode, TraktError> {
        let response = self.client
            .exchange_device_code()
            .map_err(|e| TraktError::AuthError(format!("Failed to create device code request: {}", e)))?
            .request_async::<_, _, _, EmptyExtraDeviceAuthorizationFields>(async_http_client)
            .await
            .map_err(|e| TraktError::AuthError(format!("Failed to request device code: {}", e)))?;

        Ok(TraktDeviceCode {
            device_code: response.device_code().secret().clone(),
            user_code: response.user_code().secret().clone(),
            verification_url: response.verification_uri().to_string(),
            expires_in: response.expires_in().as_secs() as u32,
            interval: response.interval().as_secs() as u32,
        })
    }

    pub async fn poll_device_token(&self, device_code: String) -> Result<bool, TraktError> {
        let client = reqwest::Client::new();
        
        #[derive(Serialize)]
        struct PollRequest {
            code: String,
            client_id: String,
            client_secret: String,
        }

        #[derive(Deserialize)]
        struct PollResponse {
            access_token: String,
            refresh_token: String,
            expires_in: i64,
        }

        let response = client.post("https://api.trakt.tv/oauth/device/token")
            .json(&PollRequest {
                code: device_code,
                client_id: self.client_id.clone(),
                client_secret: self.client_secret.clone(),
            })
            .send()
            .await?;

        if response.status().is_success() {
            let data: PollResponse = response.json().await?;
            let tokens = TraktTokens {
                access_token: data.access_token,
                refresh_token: data.refresh_token,
                expires_at: Utc::now().timestamp() + data.expires_in,
            };
            let serialized = serde_json::to_string(&tokens)?;
            self.storage.save_item("trakt_tokens".to_string(), serialized)?;
            Ok(true)
        } else if response.status().as_u16() == 400 {
            Ok(false)
        } else {
            let err_body = response.text().await?;
            Err(TraktError::AuthError(format!("Device polling failed: {}", err_body)))
        }
    }

    fn save_token_response(
        &self, 
        response: StandardTokenResponse<EmptyExtraTokenFields, BasicTokenType>
    ) -> Result<(), TraktError> {
        let access_token = response.access_token().secret().clone();
        let refresh_token = response.refresh_token()
            .map(|t| t.secret().clone())
            .unwrap_or_default();
        
        let expires_in = response.expires_in()
            .map(|d| d.as_secs() as i64)
            .unwrap_or(0);
        
        let expires_at = Utc::now().timestamp() + expires_in;

        let tokens = TraktTokens {
            access_token,
            refresh_token,
            expires_at,
        };

        let serialized = serde_json::to_string(&tokens)?;
        self.storage.save_item("trakt_tokens".to_string(), serialized)?;
        
        Ok(())
    }

    fn load_tokens(&self) -> Result<Option<TraktTokens>, TraktError> {
        match self.storage.read_item("trakt_tokens".to_string())? {
            Some(s) => Ok(Some(serde_json::from_str(&s)?)),
            None => Ok(None),
        }
    }

    fn get_refresh_token(&self) -> Result<Option<String>, TraktError> {
        Ok(self.load_tokens()?.map(|t| t.refresh_token))
    }

    pub fn logout(&self) -> Result<(), TraktError> {
        self.storage.remove_item("trakt_tokens".to_string())?;
        Ok(())
    }
}
