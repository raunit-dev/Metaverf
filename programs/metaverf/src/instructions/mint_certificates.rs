use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct MintCertificates<'info> {
    #[account(mut)]
    pub admim: Signer<'info>,
}

impl<'info> MintCertificates<'info> {}
