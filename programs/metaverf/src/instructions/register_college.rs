use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
    token::{transfer_checked, TransferChecked},
};


use crate::state::{CollegeAccount, MetaverfAccount};



#[instruction(college_id: u16)]
#[derive(Accounts)]
pub struct RegisterCollege<'info> {

    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(mut)]
    pub mint_usdc: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub college_authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"protocol"],
        bump = metaverf_account.verf_bump
    )]
    pub metaverf_account: Account<'info, MetaverfAccount>,

    #[account(
        mut,
        associated_token::mint = mint_usdc,
        associated_token::authority = metaverf_account
    )]
    pub treasury: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init,
        payer = college_authority,
        seeds = [b"college", college_id.to_le_bytes().as_ref()], //
        bump,
        space = 8 + CollegeAccount::INIT_SPACE
    )]
    pub college_account: Account<'info, CollegeAccount>,

    #[account(
        mut,
        associated_token::mint = mint_usdc,
        associated_token::authority = college_authority
    )]
    pub payer_token_account: InterfaceAccount<'info, TokenAccount>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

impl<'info> RegisterCollege<'info> {
    pub fn register_college(&mut self,college_id:u16,bumps: &RegisterCollegeBumps) -> Result<()> { //, college_id: u16
        // Initialize the college account
        self.college_account.set_inner(CollegeAccount {
            id: college_id,
            authority: self.college_authority.key(),
            last_payment: Clock::get()?.unix_timestamp,
            active: true,
            bump: bumps.college_account,
            update_authority: self.college_authority.key(),
            collections: Vec::new(),
        });
        
        // Transfer annual fee to protocol treasury
        let cpi_accounts = TransferChecked {
            from: self.payer_token_account.to_account_info(),
            mint: self.mint_usdc.to_account_info(),
            to: self.treasury.to_account_info(),
            authority: self.college_authority.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(
            self.token_program.to_account_info(),
            cpi_accounts
        );

        transfer_checked(
            cpi_ctx,
            self.metaverf_account.annual_fee,
            self.mint_usdc.decimals,
        )?;

        // Update protocol's college counter
        self.metaverf_account.uni_no += 1;
        
        Ok(())
    }
}