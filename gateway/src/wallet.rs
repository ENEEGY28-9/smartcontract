use crate::encryption::{encrypt_private_key, decrypt_private_key};
use rand::RngCore;
use tracing::info;
use ed25519_dalek::{SigningKey, VerifyingKey};

#[derive(Debug, Clone)]
pub struct SolanaWallet {
    pub public_key: String,    // Base58 encoded public key (wallet address)
    pub private_key_encrypted: String, // AES encrypted private key
    pub private_key_decrypted: Option<String>, // Cached decrypted key (use carefully!)
}

pub fn create_real_solana_wallet() -> Result<SolanaWallet, Box<dyn std::error::Error + Send + Sync>> {
    // Generate a REAL Ed25519 private key (32 bytes of cryptographically secure random data)
    let mut private_key_bytes = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut private_key_bytes);

    // Create REAL Ed25519 SigningKey from random bytes
    let signing_key = SigningKey::from_bytes(&private_key_bytes);

    // Derive public key using REAL elliptic curve scalar multiplication: public_key = secret_key * G
    let verifying_key = signing_key.verifying_key();

    // Get the raw bytes for both keys
    let public_key_bytes = verifying_key.to_bytes();
    let private_key_bytes = signing_key.to_bytes();

    // Verify derivation is deterministic (same private key -> same public key)
    let verify_signing_key = SigningKey::from_bytes(&private_key_bytes);
    let verify_verifying_key = verify_signing_key.verifying_key();
    assert_eq!(public_key_bytes, verify_verifying_key.to_bytes(), "Ed25519 derivation must be deterministic");

    // Convert keys to Solana base58 format (same as Solana addresses use)
    let public_key_base58 = bs58::encode(&public_key_bytes).into_string();
    let private_key_base58 = bs58::encode(&private_key_bytes).into_string();

    // Encrypt the private key using AES-GCM
    let private_key_encrypted = encrypt_private_key(&private_key_base58)?;

    info!("Created REAL Ed25519 Solana wallet with proper elliptic curve cryptography: {}", public_key_base58);

    Ok(SolanaWallet {
        public_key: public_key_base58,
        private_key_encrypted,
        private_key_decrypted: None,
    })
}

impl SolanaWallet {
    pub fn get_decrypted_private_key(&mut self) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
        if let Some(ref decrypted) = self.private_key_decrypted {
            return Ok(decrypted.clone());
        }

        let decrypted = decrypt_private_key(&self.private_key_encrypted)?;
        self.private_key_decrypted = Some(decrypted.clone());
        Ok(decrypted)
    }

    pub fn get_keypair(&mut self) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
        // Return the decrypted private key for Solana wallet operations
        // This is the proper Ed25519 private key that can be used with Solana libraries
        self.get_decrypted_private_key()
    }

    pub fn clear_decrypted_cache(&mut self) {
        // Clear decrypted private key from memory for security
        self.private_key_decrypted = None;
    }
}
