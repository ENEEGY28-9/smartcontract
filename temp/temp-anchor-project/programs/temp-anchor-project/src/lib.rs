use anchor_lang::prelude::*;

declare_id!("Gbi6PZNiC7BvPaCVkUfS3YXf3RbkTCwA7vczsvS54SS7");

#[program]
pub mod temp_anchor_project {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
