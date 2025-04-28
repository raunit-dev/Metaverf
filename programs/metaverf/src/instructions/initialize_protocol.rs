use anchor_lang::prelude::*;
use crate::state::MetaverfAccount;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};

#[derive(Accounts)]
pub struct InitializeProtocol<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    pub mint_usdc: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        init,
        payer = admin,
        seeds = [b"protocol"],
        bump,
        space = 8 + MetaverfAccount::INIT_SPACE,
    )]
    pub metaverf_account: Box<Account<'info, MetaverfAccount>>,

    #[account(
        init,
        payer = admin,
        associated_token::mint = mint_usdt,
        associated_token::authority = metaverf_account,
        associated_token::token_program = token_program
    )]
    pub treasury: Box<InterfaceAccount<'info, TokenAccount>>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

impl<'info> InitializeProtocol<'info> {
    pub fn initialize_protocol(
        &mut self,
        annual_fee: u64,
        subscription_duration: i64,
        bumps: &InitializeProtocolBumps,
    ) -> Result<()> {
        self.metaverf_account.set_inner(MetaverfAccount {
            admin_key: self.admin.key(),
            uni_no: 0,
            verf_bump: bumps.metaverf_account,
            annual_fee,
            // subscription_duration,
        });

        Ok(())
    }
}
