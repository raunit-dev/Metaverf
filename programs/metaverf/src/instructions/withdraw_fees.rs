use crate::state::MetaverfAccount;
use anchor_lang::prelude::*;
use anchor_spl::token::{transfer_checked, TransferChecked};
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};

#[derive(Accounts)]
pub struct WithdrawFees<'info> {
    #[account(
        mut
    )]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"protocol"],
        bump = metaverf_account.verf_bump
    )]
    pub metaverf_account: Account<'info, MetaverfAccount>,

    #[account(
        mut,
        associated_token::mint = mint_usdc,
        associated_token::authority = metaverf_account,
        associated_token::token_program = token_program
    )]
    pub treasury: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init,
        payer = admin,
        associated_token::mint = mint_usdc,
        associated_token::authority = admin,
        associated_token::token_program = token_program
    )]
    pub admin_token_account: InterfaceAccount<'info, TokenAccount>,

    pub mint_usdc: InterfaceAccount<'info, Mint>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

impl<'info> WithdrawFees<'info> {
    pub fn withdraw_fees(&mut self, amount: u64) -> Result<()> {
        let seeds = &[b"protocol".as_ref(), &[self.metaverf_account.verf_bump]];
        let signer = &[&seeds[..]];

        let cpi_program = self.token_program.to_account_info();

        let cpi_accounts = TransferChecked {
            from: self.treasury.to_account_info(),
            mint: self.mint_usdc.to_account_info(),
            to: self.admin_token_account.to_account_info(),
            authority: self.metaverf_account.to_account_info(),
        };

        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);

        transfer_checked(cpi_ctx, amount, self.mint_usdc.decimals)?;//withdrawing the entire amount of stablecoins stored in my treasury 
        Ok(())
    }
}
