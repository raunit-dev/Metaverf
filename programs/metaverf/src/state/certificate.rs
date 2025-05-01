use anchor_lang::prelude::*;

#[account]
pub struct Certificate {
    pub owner: Pubkey,
    pub traits: Vec<u8>,
}

impl Space for Certificate {

    const INIT_SPACE: usize = 8 + 32 + (4 + 32);
}
