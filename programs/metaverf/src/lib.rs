#![allow(unexpected_cfgs)]
use anchor_lang::prelude::*;
pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("C5wcse5xEf1XNtivNWozSM81ebdcFx7gYwiJUS5XUKp2");

// #[derive(AnchorSerialize, AnchorDeserialize)]
// pub struct CertificateArgs {
//     pub name: String,
//     pub uri: String,
// }

// #[derive(AnchorSerialize, AnchorDeserialize)]
// pub struct AddCollectionArgs {
//     pub name: String,
//     pub uri: String,
// }

#[program]
pub mod metaverf {
    use super::*;

    pub fn initialize(ctx: Context<InitializeProtocol>, annual_fee: u64, subscription_duration: i64) -> Result<()> {
        ctx.accounts.initialize_protocol(annual_fee, subscription_duration, &ctx.bumps)
    }

    pub fn register_college(ctx: Context<RegisterCollege>,college_id: u16) -> Result<()> {
        ctx.accounts.register_college(college_id,&ctx.bumps)
    }

    pub fn renew_subscription(ctx: Context<RenewSubscription>,_college_id: u16) -> Result<()> {
        ctx.accounts.renew_subscription()
    }

    pub fn update_parameters(ctx: Context<UpdateParameter>, annual_fee: Option<u64>, subscription_duration: Option<i64>) -> Result<()> {
        ctx.accounts.update_parameters(annual_fee, subscription_duration)
    }

    pub fn withdraw_fees(ctx: Context<WithdrawFees>, amount: u64) -> Result<()> {
        ctx.accounts.withdraw_fees(amount)
    }

    pub fn add_collection(ctx: Context<AddCollection>,_college_id: u16,args: AddCollectionArgs) -> Result<()> {
        ctx.accounts.add_collection(args)
    }

    pub fn mint_certificate(ctx: Context<MintCertificate>,_college_id: u16, args: CertificateArgs) -> Result<()> {
        ctx.accounts.mint_certificate(args)
    }
}
