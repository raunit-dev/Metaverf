use anchor_lang::prelude::*;
use mpl_core::{
    instructions::CreateCollectionV2CpiBuilder,
    types::{Attributes, Attribute, Plugin, PluginAuthority, PluginAuthorityPair},
    ID as MPL_CORE_ID,
};

use crate::state::CollegeAccount;
use crate::error::CertificateError;
use crate::college::CollectionInfo;

#[derive(Accounts)]
#[instruction(college_id: u16)]
pub struct AddCollection<'info> {
    #[account(mut)]
    pub college_authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"college", college_account.id.to_le_bytes().as_ref()],
        bump = college_account.bump,
        constraint = college_account.authority == college_authority.key() @ CertificateError::NotAuthorized,
        constraint = college_account.active @ CertificateError::CollegeNotActive,
    )]
    pub college_account: Account<'info, CollegeAccount>,
    
    #[account(mut)]
    ///CHECK: UncheckedAccount will be checked by mpl
    pub new_collection: Signer<'info>,

    #[account(address = MPL_CORE_ID)]
    ///CHECK: UncheckedAccount will be checked by mpl
    pub mpl_core_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct AddCollectionArgs {
    pub name: String,
    pub uri: String,
}

impl<'info> AddCollection<'info> {
    pub fn add_collection(&mut self, args: AddCollectionArgs) -> Result<()> {
        // Check if collection limit is reached
        require!(
            self.college_account.collections.len() < 10,
            CertificateError::CollectionLimitReached
        );

        // Create the new collection with college as owner and update authority
        CreateCollectionV2CpiBuilder::new(&self.mpl_core_program.to_account_info())
            .collection(&self.new_collection.to_account_info())
            .payer(&self.college_authority.to_account_info())
            .update_authority(Some(&self.college_authority.to_account_info()))
            .system_program(&self.system_program.to_account_info())
            .name(args.name.clone())
            .uri(args.uri.clone())
            .plugins(vec![
                PluginAuthorityPair {
                    plugin: Plugin::Attributes(Attributes {
                        attribute_list: vec![
                            Attribute {
                                key: "College ID".to_string(),
                                value: self.college_account.id.to_string(),
                            },
                            Attribute {
                                key: "Collection Type".to_string(),
                                value: "Academic Certificate".to_string(),
                            },
                        ],
                    }),
                    authority: Some(PluginAuthority::UpdateAuthority),
                },
            ])
            .invoke()?;

        // Add the new collection to the college's collections
        self.college_account.collections.push(CollectionInfo {
            collection: self.new_collection.key(),
            bump: 0,
            name: args.name,
            uri: args.uri,
        });

        Ok(())
    }
}