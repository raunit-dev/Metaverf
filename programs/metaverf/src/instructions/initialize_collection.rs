use crate::state::config::Config;
use anchor_lang::prelude::*;
use mpl_core::instructions::CreateCollectionV2CpiBuilder;

#[derive(AnchorDeserialize,AnchorSerialize)]
pub struct CreateCollectionArgs {
    pub name: String,
    pub uri: String,
}

use crate::state::college::CollegeAccount;

#[derive(Accounts)]
pub struct CreateCollection<'info> {
    #[account(mut)]
    pub collection: Signer<'info>,
    #[account(mut)]
    pub payer:Signer<'info>,
    //this account will be checked by the mpl core program
    pub update_authority: Option<UncheckedAccount<'info>>,
    pub system_program: Program<'info,System>,
    #[account(address = mpl_core::ID)]
    pub mpl_core_program: UncheckedAccount<'info>,
    //config account to store the collection address
    #[account(mut)]
    pub college: Account<'info,CollegeAccount>,

}

impl<'info> CreateCollection<'info> {
    pub fn create_core_collection(&self,args: CreateCollectionArgs) -> Result<()> {
        let update_authority = match &self.update_authority {
            Some(update_authority) => Some(update_authority.to_account_info()),
            None => None,
        };

        CreateCollectionV2CpiBuilder::new(&self.mpl_core_program.to_account_info())
              .collection(&self.collection.to_account_info)
              .payer(&self.payer.to_account_info)
              .update_authority(update_authority.as_ref())
              .system_program(&self.system_program.to_account_info())
              .uri(args.name)
              .uri(args.uri)
              .invoke()?;

              msg!("Collection created successfully: {}", self.collection.key());
              Ok(())
    }
}