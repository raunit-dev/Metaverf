use anchor_lang::prelude::*;
use mpl_core::{
    accounts::BaseCollectionV1,
    instructions::CreateV1CpiBuilder,
    types::{DataState, Plugin, PluginAuthority, PluginAuthorityPair},
    ID as MPL_CORE_ID,
};

use crate::state::{CollegeAccount, CollectionInfo};

#[derive(Accounts)]
pub struct AddCollection<'info> {
    #[account(mut)]
    pub college: Signer<'info>,

    #[account(
        mut,
        seeds = [b"college", college_account.id.to_le_bytes().as_ref()],
        bump = college_account.bump,
        constraint = college_account.authority == college.key() @ ErrorCode::NotCollegeAuthority,
        constraint = college_account.active @ ErrorCode::SubscriptionExpired,
    )]
    pub college_account: Account<'info, CollegeAccount>,

    #[account(
        init,
        payer = college,
        space = BaseCollectionV1::INIT_SPACE
    )]
    pub new_collection: UncheckedAccount<'info>,

    #[account(address = MPL_CORE_ID)]
    pub mpl_core_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct AddCollectionArgs {
    pub name: String,
    pub uri: String,
}

impl<'info> AddCollection<'info> {
    pub fn add_collection(&mut self, args: AddCollectionArgs, bumps: &AddCollectionBumps) -> Result<()> {
        // Create the new collection with college as owner and update authority
        CreateV1CpiBuilder::new(&self.mpl_core_program.to_account_info())
            .asset(&self.new_collection.to_account_info())
            .authority(Some(&self.college.to_account_info()))
            .payer(&self.college.to_account_info())
            .owner(Some(&self.college.to_account_info()))
            .update_authority(Some(&self.college.to_account_info()))
            .system_program(&self.system_program.to_account_info())
            .data_state(DataState::AccountState)
            .name(args.name.clone())
            .uri(args.uri.clone())
            .invoke()?;

        // Add the new collection to the college's collections
        self.college_account.collections.push(CollectionInfo {
            collection: self.new_collection.key(),
            bump: bumps.new_collection,
            name: args.name,
            uri: args.uri,
        });

        Ok(())
    }
}

#[error_code]
pub enum ErrorCode {
    #[msg("Only the college authority can perform this action")]
    NotCollegeAuthority,
    #[msg("Subscription has expired")]
    SubscriptionExpired,
} 