use anchor_lang::prelude::*;


#[account]
#[derive(InitSpace)]
pub struct MetaverfAccount {
    pub admin_key: Pubkey,//The admin of the protocl
    pub uni_no: u16,//To keep the track of the Uni
    pub annual_fee: u64,//The annual fee my protocol is going to charge
    pub verf_bump: u8,//The bump of the protocol
    pub subscription_duration: i64//The subscription duration of the protocol
}
