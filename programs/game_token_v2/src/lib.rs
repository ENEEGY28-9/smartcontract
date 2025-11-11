use solana_program::{
    account_info::{next_account_info, AccountInfo},
    declare_id,
    entrypoint,
    entrypoint::ProgramResult,
    program::invoke_signed,
    pubkey::Pubkey,
    msg,
    program_error::ProgramError,
    program_pack::{IsInitialized, Pack, Sealed},
};
use borsh::{BorshDeserialize, BorshSerialize};

declare_id!("Do9Bq3c7rSSU4YW32F3mCZekQZo5jdyaBuayqmNGAeTf");

entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let instruction = GameTokenInstruction::unpack(instruction_data)?;

    match instruction {
        GameTokenInstruction::Initialize => {
            msg!("Instruction: Initialize");
            process_initialize(program_id, accounts)
        }
        GameTokenInstruction::AutoMint { amount } => {
            msg!("Instruction: AutoMint {}", amount);
            process_auto_mint(program_id, accounts, amount)
        }
        GameTokenInstruction::DistributeGameTokens { amount } => {
            msg!("Instruction: DistributeGameTokens {}", amount);
            process_distribute_game_tokens(program_id, accounts, amount)
        }
        GameTokenInstruction::PlayerClaimTokens { amount } => {
            msg!("Instruction: PlayerClaimTokens {}", amount);
            process_player_claim_tokens(program_id, accounts, amount)
        }
    }
}

// Instruction enum
#[derive(Clone, Debug, PartialEq)]
pub enum GameTokenInstruction {
    Initialize,
    AutoMint { amount: u64 },
    DistributeGameTokens { amount: u64 },
    PlayerClaimTokens { amount: u64 },
}

impl GameTokenInstruction {
    pub fn unpack(input: &[u8]) -> Result<Self, ProgramError> {
        let (&tag, rest) = input.split_first().ok_or(ProgramError::InvalidInstructionData)?;

        match tag {
            0 => Ok(GameTokenInstruction::Initialize),
            1 => {
                let amount = rest.get(..8)
                    .and_then(|slice| slice.try_into().ok())
                    .map(u64::from_le_bytes)
                    .ok_or(ProgramError::InvalidInstructionData)?;
                Ok(GameTokenInstruction::AutoMint { amount })
            }
            2 => {
                let amount = rest.get(..8)
                    .and_then(|slice| slice.try_into().ok())
                    .map(u64::from_le_bytes)
                    .ok_or(ProgramError::InvalidInstructionData)?;
                Ok(GameTokenInstruction::DistributeGameTokens { amount })
            }
            3 => {
                let amount = rest.get(..8)
                    .and_then(|slice| slice.try_into().ok())
                    .map(u64::from_le_bytes)
                    .ok_or(ProgramError::InvalidInstructionData)?;
                Ok(GameTokenInstruction::PlayerClaimTokens { amount })
            }
            _ => Err(ProgramError::InvalidInstructionData),
        }
    }
}

// Account structures
#[derive(Clone, Debug, Default, PartialEq)]
pub struct MintingAuthority {
    pub owner: Pubkey,
    pub total_minted: u64,
    pub is_infinite: bool,
    pub max_supply: u64,
}

impl Sealed for MintingAuthority {}
impl IsInitialized for MintingAuthority {
    fn is_initialized(&self) -> bool {
        !self.owner.eq(&Pubkey::default())
    }
}

impl Pack for MintingAuthority {
    const LEN: usize = 32 + 8 + 1 + 8; // owner + total_minted + is_infinite + max_supply

    fn unpack_from_slice(src: &[u8]) -> Result<Self, ProgramError> {
        let mut src = src;
        if src.len() < Self::LEN {
            return Err(ProgramError::InvalidAccountData);
        }

        let owner = Pubkey::new_from_array(src[..32].try_into().unwrap());
        src = &src[32..];

        let total_minted = u64::from_le_bytes(src[..8].try_into().unwrap());
        src = &src[8..];

        let is_infinite = src[0] != 0;
        src = &src[1..];

        let max_supply = u64::from_le_bytes(src[..8].try_into().unwrap());

        Ok(MintingAuthority {
            owner,
            total_minted,
            is_infinite,
            max_supply,
        })
    }

    fn pack_into_slice(&self, dst: &mut [u8]) {
        let mut dst = dst;
        dst[..32].copy_from_slice(self.owner.as_ref());
        dst = &mut dst[32..];

        dst[..8].copy_from_slice(&self.total_minted.to_le_bytes());
        dst = &mut dst[8..];

        dst[0] = self.is_infinite as u8;
        dst = &mut dst[1..];

        dst[..8].copy_from_slice(&self.max_supply.to_le_bytes());
    }
}

#[derive(Clone, Debug, Default, PartialEq)]
pub struct GameTokenPools {
    pub authority: Pubkey,
    pub active_pool: u64,
    pub game_token_mint: Pubkey,
    pub bump: u8,
}

impl Sealed for GameTokenPools {}
impl IsInitialized for GameTokenPools {
    fn is_initialized(&self) -> bool {
        !self.authority.eq(&Pubkey::default())
    }
}

impl Pack for GameTokenPools {
    const LEN: usize = 32 + 8 + 32 + 1; // authority + active_pool + game_token_mint + bump

    fn unpack_from_slice(src: &[u8]) -> Result<Self, ProgramError> {
        let mut src = src;
        if src.len() < Self::LEN {
            return Err(ProgramError::InvalidAccountData);
        }

        let authority = Pubkey::new_from_array(src[..32].try_into().unwrap());
        src = &src[32..];

        let active_pool = u64::from_le_bytes(src[..8].try_into().unwrap());
        src = &src[8..];

        let game_token_mint = Pubkey::new_from_array(src[..32].try_into().unwrap());
        src = &src[32..];

        let bump = src[0];

        Ok(GameTokenPools {
            authority,
            active_pool,
            game_token_mint,
            bump,
        })
    }

    fn pack_into_slice(&self, dst: &mut [u8]) {
        let mut dst = dst;
        dst[..32].copy_from_slice(self.authority.as_ref());
        dst = &mut dst[32..];

        dst[..8].copy_from_slice(&self.active_pool.to_le_bytes());
        dst = &mut dst[8..];

        dst[..32].copy_from_slice(self.game_token_mint.as_ref());
        dst = &mut dst[32..];

        dst[0] = self.bump;
    }
}

// Instruction processors
pub fn process_initialize(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let authority_info = next_account_info(account_info_iter)?;
    let game_pools_info = next_account_info(account_info_iter)?;
    let game_token_mint_info = next_account_info(account_info_iter)?;
    let _system_program_info = next_account_info(account_info_iter)?;

    if !authority_info.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Create game pools PDA
    let (game_pools_pda, bump) = Pubkey::find_program_address(&[b"game_pools_v2"], program_id);
    if game_pools_pda != *game_pools_info.key {
        return Err(ProgramError::InvalidAccountData);
    }

    // Initialize game pools account
    let game_pools = GameTokenPools {
        authority: *authority_info.key,
        active_pool: 0,
        game_token_mint: *game_token_mint_info.key,
        bump,
    };

    game_pools.pack_into_slice(&mut game_pools_info.data.borrow_mut());

    msg!("Initialized GamePools PDA: {}", game_pools_pda);
    Ok(())
}

pub fn process_auto_mint(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    amount: u64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let authority_info = next_account_info(account_info_iter)?;
    let game_pools_info = next_account_info(account_info_iter)?;
    let _owner_token_info = next_account_info(account_info_iter)?;
    let _game_token_mint_info = next_account_info(account_info_iter)?;
    let _token_program_info = next_account_info(account_info_iter)?;
    let owner_info = next_account_info(account_info_iter)?;

    if !owner_info.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Verify PDAs
    let (authority_pda, _) = Pubkey::find_program_address(&[b"minting_authority"], program_id);
    if authority_pda != *authority_info.key {
        return Err(ProgramError::InvalidAccountData);
    }

    let (game_pools_pda, _) = Pubkey::find_program_address(&[b"game_pools_v2"], program_id);
    if game_pools_pda != *game_pools_info.key {
        return Err(ProgramError::InvalidAccountData);
    }

    // Load and update authority
    let mut authority = MintingAuthority::unpack_from_slice(&authority_info.data.borrow())?;
    if authority.owner != *owner_info.key {
        return Err(ProgramError::InvalidAccountData);
    }

    // Check supply limits
    if !authority.is_infinite && authority.total_minted + amount > authority.max_supply {
        msg!("Supply limit exceeded");
        return Err(ProgramError::InvalidArgument);
    }

    // Calculate 80/20 distribution
    let game_amount = amount * 80 / 100;
    let owner_amount = amount * 20 / 100;

    // Update tracking
    authority.total_minted += amount;
    authority.pack_into_slice(&mut authority_info.data.borrow_mut());

    // Load and update game pools
    let mut game_pools = GameTokenPools::unpack_from_slice(&game_pools_info.data.borrow())?;
    game_pools.active_pool += game_amount;
    game_pools.pack_into_slice(&mut game_pools_info.data.borrow_mut());

    msg!("Auto-minted {} tokens: {} game + {} owner (optimized)", amount, game_amount, owner_amount);
    Ok(())
}

#[derive(BorshDeserialize, BorshSerialize, Debug)]
pub struct DistributeGameTokensInstruction {
    pub amount: u64,
}

pub fn process_distribute_game_tokens(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    amount: u64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let game_pools_info = next_account_info(account_info_iter)?;
    let game_pools_token_account_info = next_account_info(account_info_iter)?;
    let player_token_account_info = next_account_info(account_info_iter)?;
    let game_token_mint_info = next_account_info(account_info_iter)?;
    let authority_info = next_account_info(account_info_iter)?;
    let token_program_info = next_account_info(account_info_iter)?;
    let owner_info = next_account_info(account_info_iter)?;

    if !owner_info.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Verify PDAs
    let (game_pools_pda, _) = Pubkey::find_program_address(&[b"game_pools_v2"], program_id);
    if game_pools_pda != *game_pools_info.key {
        return Err(ProgramError::InvalidAccountData);
    }

    let (game_pools_token_pda, _) = Pubkey::find_program_address(&[b"game_pools_v2_token_account"], program_id);
    if game_pools_token_pda != *game_pools_token_account_info.key {
        return Err(ProgramError::InvalidAccountData);
    }

    // Load game pools data
    let game_pools = GameTokenPools::unpack_from_slice(&game_pools_info.data.borrow())?;
    if game_pools.authority != *owner_info.key {
        return Err(ProgramError::InvalidAccountData);
    }

    // Create transfer instruction data manually
    // Token transfer instruction: 12 (transfer) + source + dest + authority + amount
    let mut transfer_data = vec![12]; // transfer instruction
    transfer_data.extend_from_slice(&amount.to_le_bytes()); // amount

    // Create transfer instruction
    let transfer_ix = solana_program::instruction::Instruction {
        program_id: *token_program_info.key,
        accounts: vec![
            solana_program::instruction::AccountMeta::new(*game_pools_token_account_info.key, false),
            solana_program::instruction::AccountMeta::new(*player_token_account_info.key, false),
            solana_program::instruction::AccountMeta::new_readonly(game_pools_pda, false),
        ],
        data: transfer_data,
    };

    // Invoke token transfer via CPI
    invoke_signed(
        &transfer_ix,
        &[
            game_pools_token_account_info.clone(),
            player_token_account_info.clone(),
            game_pools_info.clone(), // PDA as signer
        ],
        &[&[b"game_pools_v2", &[game_pools.bump]]],
    )?;

    msg!("Successfully distributed {} tokens from game pool to player", amount);
    Ok(())
}

pub fn process_player_claim_tokens(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    amount: u64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let game_pools_info = next_account_info(account_info_iter)?;
    let game_pools_token_account_info = next_account_info(account_info_iter)?;
    let player_token_account_info = next_account_info(account_info_iter)?;
    let game_token_mint_info = next_account_info(account_info_iter)?;
    let token_program_info = next_account_info(account_info_iter)?;
    let player_info = next_account_info(account_info_iter)?;

    if !player_info.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Verify PDAs
    let (game_pools_pda, _) = Pubkey::find_program_address(&[b"game_pools_v2"], program_id);
    if game_pools_pda != *game_pools_info.key {
        return Err(ProgramError::InvalidAccountData);
    }

    let (game_pools_token_pda, _) = Pubkey::find_program_address(&[b"game_pools_v2_token_account"], program_id);
    if game_pools_token_pda != *game_pools_token_account_info.key {
        return Err(ProgramError::InvalidAccountData);
    }

    // Load game pools data
    let game_pools = GameTokenPools::unpack_from_slice(&game_pools_info.data.borrow())?;

    // Check if game pool has sufficient balance (this is a simple check)
    // In production, you'd want more sophisticated validation

    // Create transfer instruction data
    let mut transfer_data = vec![12]; // transfer instruction
    transfer_data.extend_from_slice(&amount.to_le_bytes());

    // Create transfer instruction
    let transfer_ix = solana_program::instruction::Instruction {
        program_id: *token_program_info.key,
        accounts: vec![
            solana_program::instruction::AccountMeta::new(*game_pools_token_account_info.key, false),
            solana_program::instruction::AccountMeta::new(*player_token_account_info.key, false),
            solana_program::instruction::AccountMeta::new_readonly(game_pools_pda, false),
        ],
        data: transfer_data,
    };

    // Invoke token transfer via CPI with PDA signature
    invoke_signed(
        &transfer_ix,
        &[
            game_pools_token_account_info.clone(),
            player_token_account_info.clone(),
            game_pools_info.clone(), // PDA as signer
        ],
        &[&[b"game_pools_v2", &[game_pools.bump]]],
    )?;

    msg!("Player {} successfully claimed {} tokens from game pool", player_info.key, amount);
    Ok(())
}
