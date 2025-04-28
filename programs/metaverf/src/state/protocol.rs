use anchor_lang::prelude::*;


#[account]
#[derive(InitSpace)]
pub struct MetaverfAccount {
    pub admin_key: Pubkey,
    pub uni_no: u16,
    pub annual_fee: u64,
    pub verf_bump: u8,
    
}
