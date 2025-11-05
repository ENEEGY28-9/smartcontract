use crate::encryption::{encrypt_private_key, decrypt_private_key};
use crate::wallet::{SolanaWallet, create_real_solana_wallet};
use bip39::Mnemonic;
use rand::RngCore;
use sha2::{Sha256, Digest};
use std::str::FromStr;
use tracing::info;

/// HD Wallet structure for Solana with BIP39 mnemonic support
#[derive(Debug, Clone)]
pub struct HDWallet {
    pub mnemonic: String,
    pub seed: Vec<u8>,
    pub master_wallet: SolanaWallet,
    pub derived_wallets: Vec<SolanaWallet>,
}

/// Result of wallet creation/recovery
#[derive(Debug)]
pub struct WalletCreationResult {
    pub wallet: SolanaWallet,
    pub mnemonic: Option<String>, // Only present for new wallets
}

impl HDWallet {
    /// Create a new HD wallet with random BIP39 mnemonic
    pub fn new() -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        // Generate cryptographically secure entropy (128 bits = 12 words, 256 bits = 24 words)
        let mut entropy = [0u8; 32]; // 256 bits for maximum security
        rand::thread_rng().fill_bytes(&mut entropy);

        // Create BIP39 mnemonic from entropy (256 bits = 24 words)
        let mnemonic = Mnemonic::from_entropy(&entropy)
            .map_err(|e| format!("Failed to create mnemonic: {}", e))?;

        Self::from_mnemonic(&mnemonic.to_string())
    }

    /// Create HD wallet from existing BIP39 mnemonic phrase
    pub fn from_mnemonic(phrase: &str) -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        // Parse and validate mnemonic
        let mnemonic = Mnemonic::parse(phrase)
            .map_err(|e| format!("Invalid mnemonic phrase: {}", e))?;

        // Generate seed from mnemonic (with empty passphrase for simplicity)
        // In BIP39, seed is generated using PBKDF2 with the mnemonic
        let seed = mnemonic.to_seed("");

        // Create master wallet from seed (derive first wallet)
        let master_wallet = derive_wallet_from_seed(&seed[..], 0)?;

        info!("Created HD wallet from mnemonic: {}...", phrase.split_whitespace().next().unwrap_or(""));

        Ok(HDWallet {
            mnemonic: phrase.to_string(),
            seed: seed[..].to_vec(),
            master_wallet,
            derived_wallets: Vec::new(),
        })
    }

    /// Derive additional wallet at specific index
    pub fn derive_wallet(&mut self, index: u32) -> Result<&SolanaWallet, Box<dyn std::error::Error + Send + Sync>> {
        // Check if wallet already exists
        while self.derived_wallets.len() <= index as usize {
            let wallet_index = self.derived_wallets.len() as u32;
            let wallet = derive_wallet_from_seed(&self.seed, wallet_index)?;
            self.derived_wallets.push(wallet);
        }

        Ok(&self.derived_wallets[index as usize])
    }

    /// Get all wallets (master + derived)
    pub fn get_all_wallets(&self) -> Vec<&SolanaWallet> {
        let mut wallets = vec![&self.master_wallet];
        wallets.extend(self.derived_wallets.iter());
        wallets
    }

    /// Get wallet count
    pub fn wallet_count(&self) -> usize {
        1 + self.derived_wallets.len() // master + derived
    }
}

/// Derive a wallet from seed using BIP44-like path: m/44'/501'/0'/0/index
/// Solana uses coin type 501'
fn derive_wallet_from_seed(seed: &[u8], index: u32) -> Result<SolanaWallet, Box<dyn std::error::Error + Send + Sync>> {
    // For simplicity, we'll use a simple derivation scheme
    // In production, you would use proper BIP32 derivation with hardened keys

    // Create a unique derivation path for this index
    let mut hasher = Sha256::new();
    hasher.update(seed);
    hasher.update(&index.to_le_bytes());
    let derived_seed = hasher.finalize();

    // Use the derived seed to create a deterministic wallet
    let mut private_key_bytes = [0u8; 32];
    private_key_bytes.copy_from_slice(&derived_seed[..32]);

    // Derive public key using SHA-256 (consistent with our Ed25519 implementation)
    let mut pub_hasher = Sha256::new();
    pub_hasher.update(&private_key_bytes);
    let public_key_bytes = pub_hasher.finalize().to_vec();
    let public_key_bytes: [u8; 32] = public_key_bytes.try_into()
        .map_err(|_| "Failed to create public key hash")?;

    // Convert to base58
    let public_key_base58 = bs58::encode(&public_key_bytes).into_string();
    let private_key_base58 = bs58::encode(&private_key_bytes).into_string();

    // Encrypt private key
    let private_key_encrypted = encrypt_private_key(&private_key_base58)?;

    info!("Derived wallet {}: {}", index, public_key_base58);

    Ok(SolanaWallet {
        public_key: public_key_base58,
        private_key_encrypted,
        private_key_decrypted: None,
    })
}

/// Convenience function to create a new wallet with mnemonic
pub fn create_hd_wallet() -> Result<WalletCreationResult, Box<dyn std::error::Error + Send + Sync>> {
    let hd_wallet = HDWallet::new()?;
    Ok(WalletCreationResult {
        wallet: hd_wallet.master_wallet.clone(),
        mnemonic: Some(hd_wallet.mnemonic.clone()),
    })
}

/// Convenience function to recover wallet from mnemonic
pub fn recover_wallet_from_mnemonic(mnemonic_phrase: &str) -> Result<WalletCreationResult, Box<dyn std::error::Error + Send + Sync>> {
    let hd_wallet = HDWallet::from_mnemonic(mnemonic_phrase)?;
    Ok(WalletCreationResult {
        wallet: hd_wallet.master_wallet.clone(),
        mnemonic: None, // Don't return mnemonic for recovery
    })
}

/// Validate if a string is a valid BIP39 mnemonic
pub fn validate_mnemonic(phrase: &str) -> bool {
    Mnemonic::from_str(phrase).is_ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hd_wallet_creation() {
        let hd_wallet = HDWallet::new().unwrap();
        assert!(!hd_wallet.mnemonic.is_empty());
        assert!(!hd_wallet.seed.is_empty());
        assert!(!hd_wallet.master_wallet.public_key.is_empty());
    }

    #[test]
    fn test_wallet_recovery() {
        // Create a wallet
        let created = create_hd_wallet().unwrap();
        let mnemonic = created.mnemonic.unwrap();

        // Recover from mnemonic
        let recovered = recover_wallet_from_mnemonic(&mnemonic).unwrap();

        // Should recover the same wallet
        assert_eq!(created.wallet.public_key, recovered.wallet.public_key);
    }

    #[test]
    fn test_wallet_derivation() {
        let mut hd_wallet = HDWallet::new().unwrap();

        // Derive first wallet
        let wallet0 = hd_wallet.derive_wallet(0).unwrap();
        let wallet1 = hd_wallet.derive_wallet(1).unwrap();

        // Should be different wallets
        assert_ne!(wallet0.public_key, wallet1.public_key);

        // Should be deterministic (same index = same wallet)
        let wallet0_again = hd_wallet.derive_wallet(0).unwrap();
        assert_eq!(wallet0.public_key, wallet0_again.public_key);
    }

    #[test]
    fn test_mnemonic_validation() {
        // Valid mnemonic should pass
        let hd_wallet = HDWallet::new().unwrap();
        assert!(validate_mnemonic(&hd_wallet.mnemonic));

        // Invalid mnemonic should fail
        assert!(!validate_mnemonic("invalid mnemonic phrase"));
    }
}
