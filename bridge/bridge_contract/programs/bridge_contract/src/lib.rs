use anchor_lang::prelude::*;

declare_id!("3mesQois4qeinuPL4nu9J9DmWiy45WxdsMxoaqRDXEjY");

#[program]
pub mod bridge_contract {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
