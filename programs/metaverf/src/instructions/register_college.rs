use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};
use mpl_core::{
    accounts::BaseCollectionV1,
    instructions::CreateV1CpiBuilder,
    types::{DataState, Plugin, PluginAuthority, PluginAuthorityPair},
    ID as MPL_CORE_ID,
};

use anchor_spl::token::{transfer_checked, TransferChecked};

use crate::state::{CollegeAccount, MetaverfAccount, CollectionInfo};

#[derive(Accounts)]
pub struct RegisterCollege<'info> {
    pub admin_key: SystemAccount<'info>,
    pub mint_usdc: InterfaceAccount<'info, Mint>,

    //The Payer For Everything on the behalf of the college (not for the college)
    #[account(mut)]
    pub college_authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"protocol"],
        bump = metaverf_account.verf_bump,
        has_one = admin_key
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
        seeds = [b"college", metaverf_account.uni_no.to_le_bytes().as_ref()],
        bump,
        space = 8 + CollegeAccount::INIT_SPACE
    )]
    pub college_account: Account<'info, CollegeAccount>,

    #[account(mut)]
    pub payer_token_account: InterfaceAccount<'info, TokenAccount>,
    //The payer who Payes on the Behalf of the College(The Payer for the College)

    #[account(
        init,
        payer = college_authority,
        space = BaseCollectionV1::INIT_SPACE
    )]
    pub collection: UncheckedAccount<'info>,

    #[account(address = MPL_CORE_ID)]
    pub mpl_core_program: UncheckedAccount<'info>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

impl<'info> RegisterCollege<'info> {
    pub fn register_college(&mut self, bumps: &RegisterCollegeBumps) -> Result<()> {
        let college_id = self.metaverf_account.uni_no + 1;
        self.metaverf_account.uni_no = college_id;

        // Create the initial collection with college as owner and update authority
        CreateV1CpiBuilder::new(&self.mpl_core_program.to_account_info())
            .asset(&self.collection.to_account_info())
            .authority(Some(&self.college_authority.to_account_info()))
            .payer(&self.college_authority.to_account_info())
            .owner(Some(&self.college_authority.to_account_info()))
            .update_authority(Some(&self.college_authority.to_account_info()))
            .system_program(&self.system_program.to_account_info())
            .data_state(DataState::AccountState)
            .name(format!("College {} Collection", college_id))
            .uri("https://example.com/collection") // You might want to make this configurable
            .invoke()?;

        // Initialize the college account with the first collection
        self.college_account.set_inner(CollegeAccount {
            id: college_id,
            authority: self.college_authority.key(),
            last_payment: Clock::get()?.unix_timestamp,
            active: true,
            bump: bumps.college_account,
            update_authority: self.college_authority.key(),
            collections: vec![CollectionInfo {
                collection: self.collection.key(),
                bump: bumps.collection,
                name: format!("College {} Collection", college_id),
                uri: "https://example.com/collection".to_string(),
            }],
        });

        let cpi_program = self.token_program.to_account_info();

        let cpi_accounts = TransferChecked {
            from: self.payer_token_account.to_account_info(),
            mint: self.mint_usdc.to_account_info(),
            to: self.treasury.to_account_info(),
            authority: self.college_authority.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        transfer_checked(
            cpi_ctx,
            self.metaverf_account.annual_fee,
            self.mint_usdc.decimals,
        )?;
        Ok(())
    }
}
