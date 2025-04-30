use anchor_lang::prelude::*;
use crate::state::MetaverfAccount;

#[derive(Accounts)]
pub struct UpdateParameter<'info> {
    #[account(
        mut,
        constraint = admin.key() == metaverf_account.admin_key
    )]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"protocol"],
        bump = metaverf_account.verf_bump
    )]
    pub metaverf_account: Box<Account<'info, MetaverfAccount>>,
}

impl<'info> UpdateParameter<'info> {
    pub fn update_parameters(
        &mut self,
        annual_fee: Option<u64>,
        subscription_duration: Option<u64>,
    ) -> Result<()> {
        if let Some(fee) = annual_fee {
            self.metaverf_account.annual_fee = fee;
        }


        Ok(())
    }
}
