use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};

use anchor_spl::token::{transfer_checked, TransferChecked};

use crate::state::{CollegeAccount, MetaverfAccount};

#[derive(Accounts)]
pub struct RegisterCollege<'info> {
    pub admin_key: SystemAccount<'info>,
    pub mint_usdt: Box<InterfaceAccount<'info, Mint>>,

    #[account(mut)]
    pub college_authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"protocol"],
        bump = metaverf_account.verf_bump,
        has_one = admin_key
    )]
    pub metaverf_account: Box<Account<'info, MetaverfAccount>>,

    #[account(
        mut,
        associated_token::mint = mint_usdt,
        associated_token::authority = metaverf_account,
        associated_token::token_program = token_program
    )]
    pub treasury: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        init,
        payer = college_authority,
        seeds = [b"college", metaverf_account.uni_no.to_le_bytes().as_ref()],
        bump,
        space = 8 + CollegeAccount::INIT_SPACE
    )]
    pub college_account: Box<Account<'info, CollegeAccount>>,

    #[account(mut)]
    pub payer_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

impl<'info> RegisterCollege<'info> {
    pub fn register_college(&mut self) -> Result<()> {
        let college_id = self.metaverf_account.uni_no + 1;
        self.metaverf_account.uni_no = college_id;

        self.college_account.set_inner(CollegeAccount {
            id: college_id,
            authority: self.college_authority.key(),
            last_payment: Clock::get()?.unix_timestamp,
            active: true,
        });

        let cpi_program = self.token_program.to_account_info();

        let cpi_accounts = TransferChecked {
            from: self.payer_token_account.to_account_info(),
            mint: self.mint_usdt.to_account_info(),
            to: self.treasury.to_account_info(),
            authority: self.college_authority.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        transfer_checked(
            cpi_ctx,
            self.metaverf_account.annual_fee,
            self.mint_usdt.decimals,
        )?;
        Ok(())
    }
}
