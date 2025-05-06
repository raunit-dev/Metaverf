use anchor_lang::prelude::*;

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
