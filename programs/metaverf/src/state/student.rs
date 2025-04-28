use anchor_lang::prelude::*;

#[derive(InitSpace)]
pub struct StudentAccount {
    pub admin_key: Pubkey,
    pub student_bump: u8,
}
