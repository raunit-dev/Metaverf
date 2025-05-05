use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
    token::{transfer_checked, TransferChecked},
};
// use mpl_core::{
//     instructions::CreateV2CpiBuilder,
//     types::DataState,
//     accounts::BaseCollectionV1,
//     ID as MPL_CORE_ID,
// };

use crate::state::{CollegeAccount, MetaverfAccount};

//, CollectionInfo

// #[instruction(college_id: u16)]
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
        associated_token::authority = metaverf_account,
        associated_token::token_program = token_program
    )]
    pub treasury: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init,
        payer = college_authority,
        seeds = [b"college"], //, college_id.to_le_bytes().as_ref()
        bump,
        space = 8 + CollegeAccount::INIT_SPACE
    )]
    pub college_account: Account<'info, CollegeAccount>,

    #[account(
        mut,
        associated_token::mint = mint_usdc,
        associated_token::authority = college_authority,
        associated_token::token_program = token_program
    )]
    pub payer_token_account: InterfaceAccount<'info, TokenAccount>,

    // #[account(
    //     init,
    //     payer = college_authority,
    //       // Manual space allocation for MPL Core asset account
    //     space = 8 + 32 + 32 + 32 + 32
    // )] 
    // ///CHECK: Will be checked by mpl_core program
    // pub collection: UncheckedAccount<'info>,
    // #[account(mut)]
    // pub collection : Account<'info, BaseCollectionV1>,

    // #[account(address = MPL_CORE_ID)] 
    // ///CHECK: Verified program ID
    // pub mpl_core_program: UncheckedAccount<'info>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

impl<'info> RegisterCollege<'info> {
    pub fn register_college(&mut self, bumps: &RegisterCollegeBumps) -> Result<()> { //, college_id: u16
        // Initialize the college account
        self.college_account.set_inner(CollegeAccount {
            id: 1,
            authority: self.college_authority.key(),
            last_payment: Clock::get()?.unix_timestamp,
            active: true,
            bump: bumps.college_account,
            update_authority: self.college_authority.key(),
            // collections: vec![CollectionInfo {
            //     collection: self.collection.key(),
            //     bump: 0,
            //     name: format!("College {} Collection", 1),
            //     uri: "https://example.com/collection".to_string(),
            // }],
        });

        // Create the NFT collection
        // let collection_name = format!("College {} Collection", 1);
        // CreateV2CpiBuilder::new(&self.mpl_core_program.to_account_info())
        //      .asset(&self.college_authority.to_account_info())
        //     .collection(Some(&self.collection.to_account_info()))
        //     .authority(Some(&self.college_authority.to_account_info()))
        //     .payer(&self.college_authority.to_account_info())
        //     .owner(Some(&self.college_authority.to_account_info()))
        //     .update_authority(Some(&self.college_authority.to_account_info()))
        //     .system_program(&self.system_program.to_account_info())
        //     .data_state(DataState::AccountState)
        //     .name(collection_name)
        //     .uri("https://example.com/collection".to_string())
        //     .invoke()?;

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