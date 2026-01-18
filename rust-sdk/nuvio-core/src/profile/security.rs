use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use crate::error::NuvioResult;
use crate::error::NuvioError;

pub struct SecurityManager;

impl SecurityManager {
    pub fn hash_pin(pin: &str) -> NuvioResult<String> {
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        
        let password_hash = argon2
            .hash_password(pin.as_bytes(), &salt)
            .map_err(|e| NuvioError::SecurityError { msg: e.to_string() })?
            .to_string();
            
        Ok(password_hash)
    }

    pub fn verify_pin(pin: &str, hashed_pin: &str) -> NuvioResult<bool> {
        let parsed_hash = PasswordHash::new(hashed_pin)
            .map_err(|e| NuvioError::SecurityError { msg: e.to_string() })?;
            
        let argon2 = Argon2::default();
        
        Ok(argon2.verify_password(pin.as_bytes(), &parsed_hash).is_ok())
    }
}
