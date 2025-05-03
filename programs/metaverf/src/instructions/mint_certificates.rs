use anchor_lang::prelude::*;
use mpl_core::{
    instructions::CreateV1CpiBuilder,
    types::{DataState, PermanentFreezeDelegate, Plugin, PluginAuthorityPair},
    ID as MPL_CORE_ID,
};

use crate::state::{CollegeAccount, MetaverfAccount};
use crate::CertificateArgs;

#[derive(Accounts)]
pub struct MintCertificates<'info> {
    #[account(mut)]
    pub college: Signer<'info>,

    #[account(
        mut,
        seeds = [b"protocol"],
        bump = metaverf_account.verf_bump,
    )]
    pub metaverf_account: Account<'info, MetaverfAccount>,

    #[account(
        mut,
        seeds = [b"college", college_account.id.to_le_bytes().as_ref()],
        bump = college_account.bump,
        constraint = college_account.authority == college.key(),
        constraint = college_account.active,
    )]
    pub college_account: Account<'info, CollegeAccount>,

    #[account(
        mut,
        constraint = college_account.collections.iter().any(|c| c.collection == collection.key()) ,
        constraint = college_account.update_authority == college.key() 
    )] 
    ///CHECK: UnchecheckdAccount will be checked by mpl
    pub collection: UncheckedAccount<'info>,

    #[account(mut)]
    pub asset: Signer<'info>,

    pub student_wallet: SystemAccount<'info>,

    #[account(address = MPL_CORE_ID)] 
    ///CHECK: UnchecheckdAccount will be checked by mpl
    pub mpl_core_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> MintCertificates<'info> {
    pub fn mint_certificates(&mut self, args: CertificateArgs) -> Result<()> {
        CreateV1CpiBuilder::new(&self.mpl_core_program.to_account_info())
            .asset(&self.asset.to_account_info())
            .collection(Some(&self.collection.to_account_info()))
            .authority(Some(&self.college.to_account_info()))
            .payer(&self.college.to_account_info())
            .owner(Some(&self.student_wallet.to_account_info()))
            .update_authority(Some(&self.college.to_account_info()))
            .system_program(&self.system_program.to_account_info())
            .data_state(DataState::AccountState)
            .name(args.name)
            .uri(args.uri)
            .plugins(vec![PluginAuthorityPair {
                plugin: Plugin::PermanentFreezeDelegate(PermanentFreezeDelegate { frozen: true }),
                authority: None,
            }])
            .invoke()?;

        Ok(())
    }
}


