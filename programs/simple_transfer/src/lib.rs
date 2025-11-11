use solana_program::{
    account_info::{next_account_info, AccountInfo},
    declare_id,
    entrypoint,
    entrypoint::ProgramResult,
    program::invoke_signed,
    pubkey::Pubkey,
    msg,
    program_error::ProgramError,
};

declare_id!("Transfer11111111111111111111111111111112");

entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();

    // Accounts expected:
    // 0. Source token account (PDA-owned)
    // 1. Destination token account
    // 2. Mint account
    // 3. Token program
    // 4. Authority (PDA)

    let source_account = next_account_info(accounts_iter)?;
    let dest_account = next_account_info(accounts_iter)?;
    let mint_account = next_account_info(accounts_iter)?;
    let token_program = next_account_info(accounts_iter)?;
    let authority = next_account_info(accounts_iter)?;

    // Verify PDA
    let (expected_pda, bump) = Pubkey::find_program_address(&[b"transfer_authority"], program_id);
    if expected_pda != *authority.key {
        msg!("Invalid authority PDA");
        return Err(ProgramError::InvalidAccountData);
    }

    // Parse amount from instruction data
    let amount = u64::from_le_bytes(instruction_data[1..9].try_into().unwrap());

    msg!("Transferring {} tokens from game pool to player", amount / 1_000_000);

    // Create transfer instruction data
    let mut transfer_data = vec![12]; // transfer instruction
    transfer_data.extend_from_slice(&amount.to_le_bytes());

    // Create the transfer instruction
    let transfer_ix = solana_program::instruction::Instruction {
        program_id: *token_program.key,
        accounts: vec![
            solana_program::instruction::AccountMeta::new(*source_account.key, false),
            solana_program::instruction::AccountMeta::new(*dest_account.key, false),
            solana_program::instruction::AccountMeta::new_readonly(expected_pda, true),
        ],
        data: transfer_data,
    };

    // Invoke the transfer with PDA signature
    invoke_signed(
        &transfer_ix,
        &[
            source_account.clone(),
            dest_account.clone(),
            authority.clone(),
        ],
        &[&[b"transfer_authority", &[bump]]],
    )?;

    msg!("Successfully transferred {} tokens", amount / 1_000_000);
    Ok(())
}


