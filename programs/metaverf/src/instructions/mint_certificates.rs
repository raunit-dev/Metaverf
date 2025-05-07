use anchor_lang::prelude::*;
use mpl_core::{
    instructions::CreateV2CpiBuilder,
    types::{DataState, PermanentFreezeDelegate, Plugin, PluginAuthorityPair, Attributes, Attribute, PluginAuthority},
    ID as MPL_CORE_ID,
};

use crate::state::CollegeAccount;
// use crate::college::CollectionInfo;
use crate::error::CertificateError;
// CreateV1CpiBuilder
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CertificateArgs {
    pub name: String,
    pub uri: String,
    pub student_name: String,
    pub course_name: String,
    pub completion_date: String,
    pub grade: Option<String>,
}

#[derive(Accounts)]
#[instruction(college_id: u16)]
pub struct MintCertificate<'info> {
    
    #[account(mut)]
    pub college_authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"college", college_account.id.to_le_bytes().as_ref()],
        bump = college_account.bump,
        constraint = college_account.authority == college_authority.key() @ CertificateError::NotAuthorized,
        constraint = college_account.active @ CertificateError::CollegeNotActive,
    )]
    pub college_account: Account<'info, CollegeAccount>, //The college account which has the Initial Collection

    #[account(
        mut,
        constraint = college_account.collections.iter().any(|c| c.collection == collection.key()) @ CertificateError::CollectionNotFound,
    )] 
    ///CHECK: UncheckedAccount will be checked by mpl
    pub collection: UncheckedAccount<'info>,

    #[account(mut)]
    pub asset: Signer<'info>,

    pub student_wallet: SystemAccount<'info>,//The owner Account of the certificates minted 

    #[account(address = MPL_CORE_ID)] 
    ///CHECK: UncheckedAccount will be checked by mpl
    pub mpl_core_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> MintCertificate<'info> {
    pub fn mint_certificate(&mut self,args: CertificateArgs) -> Result<()> {
        // Create attributes for the certificate NFT
        let mut attribute_list: Vec<Attribute> = vec![
            Attribute {
                key: "Student Name".to_string(),
                value: args.student_name.clone(),
            },
            Attribute {
                key: "Course".to_string(),
                value: args.course_name.clone(),
            },
            Attribute {
                key: "Completion Date".to_string(),
                value: args.completion_date.clone(),
            },
            Attribute {
                key: "College ID".to_string(),
                value: self.college_account.id.to_string(),
            },
            Attribute {
                key: "Certificate Type".to_string(),
                value: "Academic Certificate".to_string(),
            },
        ];

        // Add grade if provided
        if let Some(grade) = args.grade {
            attribute_list.push(Attribute {
                key: "Grade".to_string(),
                value: grade,
            });
        }

        // Create the certificate NFT with PermanentFreezeDelegate to ensure immutability
        CreateV2CpiBuilder::new(&self.mpl_core_program.to_account_info())
            .asset(&self.asset.to_account_info())
            .collection(Some(&self.collection.to_account_info()))
            .authority(Some(&self.college_authority.to_account_info()))
            .payer(&self.college_authority.to_account_info())
            .owner(Some(&self.student_wallet.to_account_info()))
            .update_authority(Some(&self.college_authority.to_account_info()))
            .system_program(&self.system_program.to_account_info())
            .data_state(DataState::AccountState)
            .name(args.name)
            .uri(args.uri)
            .plugins(vec![
                // Make the certificate immutable/frozen
                PluginAuthorityPair {
                    plugin: Plugin::PermanentFreezeDelegate(PermanentFreezeDelegate { frozen: true }),
                    authority: None,
                },
                // Add certificate metadata
                PluginAuthorityPair {
                    plugin: Plugin::Attributes(Attributes { attribute_list }),
                    authority: Some(PluginAuthority::UpdateAuthority),
                },
            ])
            .invoke()?;

        Ok(())
    }
}