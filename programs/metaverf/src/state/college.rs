use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct CollegeAccount {
    pub authority: Pubkey,
    pub id: u16,
    pub last_payment: i64,
    pub active: bool,
    pub bump: u8,
    pub update_authority: Pubkey,
    pub collection: Pubkey,
    pub collection_bump: u8
}
