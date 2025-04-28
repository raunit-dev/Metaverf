use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token_interface::{Mint,TokenAccount,TokenInterface}}

use crate::state::{MetaverfAccount,CollegeAccount};

#[derive(Accounts)]
pub struct RenewSubscription <'info> {
#[account(mut)]
pub college_authority: Signer<'info>,
pub mint_usdt: Box<InterfaceAccount<'info,Mint>,

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
        associated_token::authority = metaverf_account
    )]
 pub vault: Box<InterfaceAccount<'info, TokenAccount>>,

 #[account(
     init,
     payer = college_authority,
     seeds = [b"college",metaverf_account.uni_no.to_le_bytes().as_ref()],
     bump,
     space = 8 + CollegeAccount::INIT_SPACE
 )]
pub college_account: Box<Account<'info,CollegeAccount>>,

#[account(mut)]
pub payer_token_account: Box<InterfaceAccount<'info, TokenAccount>>,


pub admin: Signer<'info>,
pub mint_usdt: Box<InterfaceAccount<'info,Mint>,

 pub associated_token_program: Program<'info,AssociatedToken>,
 pub token_program: Interface<'info,TokenInterface>,
 pub system_program: Program<'info,System>
}

impl<'info> RenewSubscription<'info> {
    pub fn renew_subscription(&mut self) -> Result<()> {

        let current_time = Clock::get()?.unix_timestamp;
        let expiry_time = self.college_account.last_payment + self.metaverf_account.subscription_duration;


        let cpi_accounts = TransferChecked {
            from: self.payer_token_account.to_account_info(),
            mint: self.mint_usdt.to_account_info(),
            to: self.vault.to_account_info(),
            authority: self.college_authority.to_account_info(),
        };

        let cpi_program = self.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        anchor_spl::token_interface::transfer_checked(
            cpi_ctx,
            self.metaverf_account.annual_fee,
            self.mint_usdt.decimals,
        )?;


        self.college_account.last_payment = current_time;
        self.college_account.active = true;

        Ok(())
    }
}
