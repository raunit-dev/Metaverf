use anchor_lang::prelude::*;
use mpl_core::{
    accounts::BaseCollectionV1,
    instructions::CreateV1CpiBuilder,
    types::{DataState, PermanentFreezeDelegate, Plugin, PluginAuthority, PluginAuthorityPair},
    ID as MPL_CORE_ID,
};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CertificateArgs {
    pub name: String,
    pub uri: String,
}

#[derive(Accounts)]
pub struct MintCertificates<'info> {
    #[account(mut)]
    pub college: Signer<'info>,

    #[account(
        mut,
        seeds = [b"protocol"],
        bump = metaverf_account.verf_bump,
    )]
    pub metaverf_account: Box<Account<'info, MetaverfAccount>>,

    #[account(
        mut,
        seeds = [b"college", college_account.id.to_le_bytes().as_ref()],
        bump = college_account.bump,
        constraint = college_account.authority == college.key() @ ErrorCode::NotCollegeAuthority,
        constraint = college_account.active @ ErrorCode::SubscriptionExpired,
    )]
    pub college_account: Box<Account<'info, CollegeAccount>>,

    #[account(mut)]
    pub collection: Box<Account<'info, BaseCollectionV1>>,

    #[account(mut)]
    pub asset: Signer<'info>,

    pub student_wallet: SystemAccount<'info>,

    #[account(address = MPL_CORE_ID)]
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

#[error_code]
pub enum ErrorCode {
    #[msg("Only the college authority can perform this action")]
    NotCollegeAuthority,
    #[msg("Subscription has expired")]
    SubscriptionExpired,
}
