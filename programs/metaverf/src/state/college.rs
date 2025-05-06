use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CollectionInfo {
    pub collection: Pubkey,
    pub bump: u8,
    pub name: String,
    pub uri: String,
}

#[account]
pub struct CollegeAccount {
    pub id: u16,
    pub authority: Pubkey,
    pub update_authority: Pubkey,
    pub last_payment: i64,
    pub active: bool,
    pub bump: u8,
    pub collections: Vec<CollectionInfo>,
}

impl CollegeAccount {
    pub const INIT_SPACE: usize = 
        2 +  // id: u16
        32 + // authority: Pubkey
        32 + // update_authority: Pubkey
        8 +  // last_payment: i64
        1 +  // active: bool
        1 +  // bump: u8
        4 +  // collections: Vec length
        10 * (32 + 1 + 64 + 128); // 10 collections max (Pubkey + bump + name + uri)
}