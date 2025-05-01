use anchor_lang::prelude::*;


#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CollectionInfo {
    pub mint:    Pubkey,
    pub edition: Pubkey,
}

impl Space for CollectionInfo {
    const INIT_SPACE: usize = 8 + 32 + 32;
}