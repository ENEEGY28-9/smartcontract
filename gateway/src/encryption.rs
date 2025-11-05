use aes_gcm::{Aes256Gcm, Key, Nonce};
use aes_gcm::aead::{Aead, KeyInit};
use base64::{Engine as _, engine::general_purpose};
use std::env;

pub fn encrypt_private_key(private_key: &str) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
    let encryption_key = get_encryption_key()?;
    let key = Key::<Aes256Gcm>::from_slice(&encryption_key);
    let cipher = Aes256Gcm::new(key);

    // Generate a random nonce
    let nonce_bytes = rand::random::<[u8; 12]>();
    let nonce = Nonce::from_slice(&nonce_bytes);

    // Encrypt the private key
    let ciphertext = cipher.encrypt(nonce, private_key.as_bytes())
        .map_err(|e| format!("Encryption failed: {}", e))?;

    // Combine nonce + ciphertext and encode as base64
    let mut combined = nonce_bytes.to_vec();
    combined.extend_from_slice(&ciphertext);
    let encrypted = general_purpose::STANDARD.encode(&combined);

    Ok(encrypted)
}

pub fn decrypt_private_key(encrypted_private_key: &str) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
    let encryption_key = get_encryption_key()?;
    let key = Key::<Aes256Gcm>::from_slice(&encryption_key);
    let cipher = Aes256Gcm::new(key);

    // Decode from base64
    let combined = general_purpose::STANDARD.decode(encrypted_private_key)?;

    if combined.len() < 12 {
        return Err("Invalid encrypted data".into());
    }

    // Extract nonce and ciphertext
    let nonce_bytes = &combined[..12];
    let ciphertext = &combined[12..];
    let nonce = Nonce::from_slice(nonce_bytes);

    // Decrypt
    let plaintext = cipher.decrypt(nonce, ciphertext)
        .map_err(|e| format!("Decryption failed: {}", e))?;

    let private_key = String::from_utf8(plaintext)?;
    Ok(private_key)
}

fn get_encryption_key() -> Result<[u8; 32], Box<dyn std::error::Error + Send + Sync>> {
    let key_str = env::var("ENCRYPTION_KEY")
        .unwrap_or_else(|_| "KMbGqOScAkQTdsziLmHNDuCZPIWnpyoB".to_string());

    if key_str.len() != 32 {
        return Err(format!("ENCRYPTION_KEY must be exactly 32 characters, got {} characters", key_str.len()).into());
    }

    let mut key = [0u8; 32];
    key.copy_from_slice(key_str.as_bytes());
    Ok(key)
}
