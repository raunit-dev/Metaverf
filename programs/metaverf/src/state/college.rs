use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct CollegeAccount {
    pub authority: Pubkey,//The authority of the college 
    pub id: u16,//The college No
    pub last_payment: i64,//To keep the track of payment in the protocol
    pub active: bool,//The status of the college whether it is active or not 
    pub bump: u8,
    pub update_authority: Pubkey,
    #[max_len(10)]
    pub collections: Vec<CollectionInfo>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CollectionInfo {
    pub collection: Pubkey,
    pub bump: u8,
    #[max_len(50)]
    pub name: String,
    #[max_len(200)]
    pub uri: String,
}

// impl Space for CollectionInfo {
//     const INIT_SPACE: usize = 8 + 32 + 1 + (4 + 32) + (4 + 32); // collection + bump + name + uri
// }

#[error_code]
pub enum CertificateError {
    #[msg("College is not active")]
    CollegeNotActive,
    
    #[msg("Not authorized")]
    NotAuthorized,
    
    #[msg("Collection not found")]
    CollectionNotFound,
    
    #[msg("Collection limit reached")]
    CollectionLimitReached,
}