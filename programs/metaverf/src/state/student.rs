use anchor_lang::prelude::*;

#[derive(InitSpace)]
#[account]
pub struct StudentData {
    #[max_len(50)]
    pub name: String, 
    #[max_len(50)]            
    pub id: String,
    #[max_len(50)]               
    pub program: String,    
    pub year: u16,                
}
