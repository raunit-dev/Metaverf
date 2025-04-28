use anchor_lang::prelude::*;

#[derive(InitSpace)]
#[account]
pub struct CollegeAccount {
    pub authority: Pubkey,
    pub id: u16,
    pub last_payment: i64,
    pub active: bool
}
