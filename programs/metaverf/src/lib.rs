#![allow(unexpected_cfgs)]
use anchor_lang::prelude::*;
pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("EaWRVXxw9uKq5ydVwqLYdmfY3gzSdRCqumRHrCFet5Rz");


#[program]
pub mod metaverf {
    use super::*;

    pub fn initialize(ctx: Context<InitializeProtocol>,annual_fee: u64,subscription_duration:u64,) -> Result<()> {
        ctx.accounts.initialize_protocol(annual_fee,subscription_duration,&ctx.bumps)
    }

    pub fn register_college(ctx: Context<RegisterCollege>) -> Result<()> {
        ctx.accounts.register_college(&ctx.bumps)
    }

    pub fn renew_subscription(ctx: Context<RenewSubscription>) -> Result<()> {
        ctx.accounts.renew_subscription()
    }

    pub fn update_parameters(ctx: Context<UpdateParameter>,annual_fee: Option<u64>,subscription_duration:Option<u64>) -> Result<()> {
        ctx.accounts.update_parameters(annual_fee,subscription_duration)
    }

    pub fn withdraw_fees(ctx: Context<WithdrawFees>,amount: u64) -> Result<()> {
        ctx.accounts.withdraw_fees(amount)
    }

    pub fn mint_certificates(ctx: Context<MintCertificate>) -> Result<()> {
        ctx.accounts.mint_certificates(args)
    }


}
