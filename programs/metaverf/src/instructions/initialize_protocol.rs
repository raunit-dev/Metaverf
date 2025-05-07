use anchor_lang::prelude::*;
use crate::state::MetaverfAccount;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};

#[derive(Accounts)]

pub struct InitializeProtocol<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,//The admin of the Protocol
    #[account(mut)]
    pub mint_usdc: InterfaceAccount<'info, Mint>,//The StableCoin we are taking on our protocol currently

    #[account(
        init,
        payer = admin,
        seeds = [b"protocol"],
        bump,
        space = 8 + MetaverfAccount::INIT_SPACE,
    )]
    pub metaverf_account: Account<'info, MetaverfAccount>,//The protocol Struct initialize

    #[account(
        init,
        payer = admin,
        associated_token::mint = mint_usdc,
        associated_token::authority = metaverf_account
    )]
    pub treasury: InterfaceAccount<'info, TokenAccount>,//The Treasury of the Protocol where all the Money will get stored

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

impl<'info> InitializeProtocol<'info> {
    pub fn initialize_protocol(
        &mut self,
        annual_fee: u64,//the price of listing your college in my protocol
        subscription_duration: i64,//for how much time 
        bumps: &InitializeProtocolBumps,
    ) -> Result<()> {
        self.metaverf_account.set_inner(MetaverfAccount {
            // admin_key: self.admin.key(),
            uni_no: 0,
            subscription_duration,
            verf_bump: bumps.metaverf_account,
            annual_fee,
        });

        Ok(())
    }
}
