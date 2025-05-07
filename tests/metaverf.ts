import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Metaverf } from "../target/types/metaverf";
import { TOKEN_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  
} from "@solana/web3.js";
import {
  createMint,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptMint,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  mintTo,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import {
    MPL_CORE_PROGRAM_ID,
    fetchCollection,
    Key
} from "@metaplex-foundation/mpl-core";
import {
  Account,
  base58,
  createSignerFromKeypair,
  generateSigner,
  signerIdentity,
  sol
} from "@metaplex-foundation/umi";
import { BN, min } from "bn.js";
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { mplCore } from '@metaplex-foundation/mpl-core'
import { assert } from "chai";

describe("metaverf", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider();
  const connection = provider.connection;

  // Use the RPC endpoint of your choice.
const umi = createUmi('http://api.devenet.solana.com')
// ... // additional umi settings, packages, and signers
.use(mplCore())


//   const connection = new Connection(
//     `https://devnet.helius-rpc.com/?api-key=7888228e-d442-425c-80f8-825464f4c357`
// );

  const annualFee = new BN(1e6);
  const subscriptionDuration = new BN(1e6);
  let admin: Keypair;
  let treasury: PublicKey;
  let mintUsdc: PublicKey;
  let adminTokenAccount: PublicKey;
  let newCollection: Keypair;
  let studentWallet1: PublicKey;
  let asset: PublicKey;

  // Create a list to store college authorities
  const totalColleges = 3;
  const collegeAuthorities: Keypair[] = [];
  const payerTokenAccounts: PublicKey[] = [];

  admin = Keypair.generate();

  // Generate keypairs for all college authorities
  for (let i = 0; i < totalColleges; i++) {
    collegeAuthorities.push(Keypair.generate());
  }

  const program = anchor.workspace.Metaverf as Program<Metaverf>;
  const programId = program.programId;
  const tokenProgram = TOKEN_PROGRAM_ID;

  const confirm = async (signature: string): Promise<string> => {
    const block = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature,
      ...block,
    });
    return signature;
  };

  const log = async (signature: string): Promise<string> => {
    console.log(
      `Your transaction signature: https://explorer.solana.com/transaction/${signature}?cluster=custom&customUrl=${connection.rpcEndpoint}`
    );
    return signature;
  };

  const [metaverfAccount, metaverfBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("protocol")],
    program.programId
  );

  before(async () => {
    // Fund admin account
    const transferIx = SystemProgram.transfer({
      fromPubkey: provider.publicKey,
      toPubkey: admin.publicKey,
      lamports: 10 * LAMPORTS_PER_SOL,
    });
    const tx = new Transaction().add(transferIx);
    await provider.sendAndConfirm(tx);

    studentWallet1 = anchor.web3.Keypair.generate();

    //add funds to new payer
    const transaction = new anchor.web3.Transaction().add(
      anchor.web3.SystemProgram.transfer({
        fromPubkey: provider.publicKey,
        toPubkey: studentWallet1.publicKey,
        lamports: 40000000,
      })
    );

    await provider.sendAndConfirm(transaction);

    // Fund all college authorities
    for (let i = 0; i < totalColleges; i++) {
      const transferIx = SystemProgram.transfer({
        fromPubkey: provider.publicKey,
        toPubkey: collegeAuthorities[i].publicKey,
        lamports: 10 * LAMPORTS_PER_SOL,
      });
      const tx = new Transaction().add(transferIx);
      await provider.sendAndConfirm(tx);
    }

    // Create USDC mint
    mintUsdc = await createMint(
      provider.connection,
      admin,
      admin.publicKey,
      null,
      6
    );

    // Get admin token account
    adminTokenAccount = (await getOrCreateAssociatedTokenAccount(
      provider.connection,
      admin,
      mintUsdc,
      admin.publicKey,
      false
    )).address;

    // Get treasury account
    treasury = getAssociatedTokenAddressSync(
      mintUsdc,
      metaverfAccount,
      true // Allow off-curve addresses for PDAs
    );

    // Create token accounts for all college authorities and mint tokens to them
    for (let i = 0; i < totalColleges; i++) {
      const payerTokenAccount = (await getOrCreateAssociatedTokenAccount(
        provider.connection,
        admin,
        mintUsdc,
        collegeAuthorities[i].publicKey,
        false
      )).address;

      payerTokenAccounts.push(payerTokenAccount);

      // Mint USDC to college authorities
      await mintTo(
        provider.connection,
        admin,
        mintUsdc,
        payerTokenAccount,
        admin,
        1000000000
      );
    }

    // Mint USDC to admin
    await mintTo(
      provider.connection,
      admin,
      mintUsdc,
      adminTokenAccount,
      admin,
      1000000000
    );
  });

  

  it("Initialize Protocol", async () => {
    try {
    const tx = await program.methods
      .initialize(annualFee, subscriptionDuration)
      .accountsPartial({
        admin: admin.publicKey,
        mintUsdc: mintUsdc,
        metaverfAccount: metaverfAccount,
        treasury: treasury,
        tokenProgram: tokenProgram,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId
      })
      .signers([admin])
      .rpc()
      .then(confirm)
      .then(log);

    console.log("Protocol initialization signature:", tx);
    }
    catch (error) {
       console.log(error)
    }
  });

  // Register and renew for each college individually
  for (let i = 0; i < totalColleges; i++) {
    it(`Register College ${i + 1}`, async () => {
      try {
      const collegeId = i + 1;
      
      // Derive PDA for this specific college ID
      const [collegeAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("college"), new Uint8Array([collegeId, 0])], // le bytes for u16
        program.programId
      );

      console.log(collegeAuthorities[i].publicKey);

      const tx = await program.methods
        .registerCollege(collegeId) // Pass college_id as number, not BN
        .accountsPartial({
          admin: admin.publicKey,
          mintUsdc: mintUsdc,
          collegeAccount: collegeAccount,
          collegeAuthority: collegeAuthorities[i].publicKey,
          metaverfAccount: metaverfAccount,
          treasury: treasury,
          payerTokenAccount: payerTokenAccounts[i],
          tokenProgram: tokenProgram,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId
        })
        .signers([admin, collegeAuthorities[i]])
        .rpc({ skipPreflight: true })
        .then(confirm)
        .then(log);

      console.log(`Register College ${collegeId} signature:`, tx);
      }
      catch (error) {
        console.log(error)
      }
    });

    it(`Renew Subscription College ${i + 1}`, async () => {
      try {
      const collegeId = i + 1;
      
      // Use the same PDA derivation as in registration for this college
      const [collegeAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("college"), new Uint8Array([collegeId, 0])], // le bytes for u16
        program.programId
      );

      const tx = await program.methods
        .renewSubscription(collegeId)
        .accountsPartial({
          admin: admin.publicKey,
          mintUsdc: mintUsdc,
          collegeAccount: collegeAccount,
          collegeAuthority: collegeAuthorities[i].publicKey,
          metaverfAccount: metaverfAccount,
          treasury: treasury,
          payerTokenAccount: payerTokenAccounts[i],
          tokenProgram: tokenProgram,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId
        })
        .signers([admin, collegeAuthorities[i]])
        .rpc()
        .then(confirm)
        .then(log);

      console.log(`Renew Subscription College ${collegeId} signature:`, tx);
      }
      catch (error) {
        console.log(error)
      }
    });

    it(`Add collections to college ${i + 1}`, async () => {
      try {
      const collegeId = i + 1;

      const [collegeAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("college"), new Uint8Array([collegeId,0])],
        program.programId
      )

      newCollection = Keypair.generate();

    const args = {
      name: "TEST COLLECTION",
      uri: "https://example.com/event"
    }

      const tx = await program.methods
      .addCollection(collegeId,args)
      .accountsStrict({
        collegeAccount: collegeAccount,
        collegeAuthority: collegeAuthorities[i].publicKey,
        mplCoreProgram: MPL_CORE_PROGRAM_ID,
        newCollection: newCollection.publicKey,
        systemProgram: SystemProgram.programId
      })
      .signers([collegeAuthorities[i],newCollection])
      .rpc()
      .then(confirm)
      .then(log)
      console.log(`Add collections to college ${collegeId} signature:`, tx);
    }
    catch (error) {
      console.log(error)
    }

    })


    it(`Add assest to college ${i + 1}`, async () => {
      try {
      const collegeId = i + 1;

      const [collegeAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("college"), new Uint8Array([collegeId,0])],
        program.programId
      )

      newCollection = Keypair.generate();

    const args = {
      name: "TEST ASSET",
      uri: "https://example.com/event",
      student_name: "RAUNIT JAISWAL",
      course_name: "Turbine",
      completion_date: "15 feb",
      grade: "1st year",
    }

    asset = Keypair.generate();
    
 
    const transaction2 = new anchor.web3.Transaction().add(
      anchor.web3.SystemProgram.transfer({
        fromPubkey: provider.publicKey,
        toPubkey: asset.publicKey,
        lamports: 40000000,
      })
    );

    await provider.sendAndConfirm(transaction2);


      const tx = await program.methods
      .mintCertificates(collegeId,args)
      .accountsStrict({
        collegeAccount: collegeAccount,
        collegeAuthority: collegeAuthorities[i].publicKey,
        mplCoreProgram: MPL_CORE_PROGRAM_ID,
        collection: newCollection.publicKey,
        systemProgram: SystemProgram.programId
      })
      .signers([collegeAuthorities[i],newCollection])
      .rpc()
      .then(confirm)
      .then(log)
      console.log(`Add colle to college ${collegeId} signature:`, tx);
    }
    catch (error) {
      console.log(error)
    }

    })
   


  }

  // it("Register Multiple Colleges Simultaneously", async () => {
  //   try {
  //   // Create new college authorities
  //   const simultaneousCollegeAuthorities = [
  //     Keypair.generate(),
  //     Keypair.generate()
  //   ];
    
  //   // Fund these new authorities
  //   for (const authority of simultaneousCollegeAuthorities) {
  //     const transferIx = SystemProgram.transfer({
  //       fromPubkey: provider.publicKey,
  //       toPubkey: authority.publicKey,
  //       lamports: 10 * LAMPORTS_PER_SOL,
  //     });
  //     await provider.sendAndConfirm(new Transaction().add(transferIx));
  //   }
    
  //   // Create token accounts for these authorities
  //   const simultaneousTokenAccounts = [];
  //   for (const authority of simultaneousCollegeAuthorities) {
  //     const tokenAccount = (await getOrCreateAssociatedTokenAccount(
  //       provider.connection,
  //       admin,
  //       mintUsdc,
  //       authority.publicKey,
  //       false
  //     )).address;
      
  //     simultaneousTokenAccounts.push(tokenAccount);
      
  //     // Mint tokens to each
  //     await mintTo(
  //       provider.connection,
  //       admin,
  //       mintUsdc,
  //       tokenAccount,
  //       admin,
  //       1000000000
  //     );
  //   }
    
  //   // Next college IDs
  //   const nextCollegeIds = [4, 5]; // After the first 3
    
  //   // PDAs for the new colleges
  //   const simultaneousCollegePDAs = nextCollegeIds.map(id => {
  //     const [pda] = PublicKey.findProgramAddressSync(
  //       [Buffer.from("college"), new Uint8Array([id, 0])], // le bytes for u16
  //       program.programId
  //     );
  //     return pda;
  //   });
    
  //   // Send transactions one after another but quickly
  //   const signatures = [];
  //   for (let i = 0; i < 2; i++) {
  //     const tx = await program.methods
  //       .registerCollege(nextCollegeIds[i])
  //       .accountsPartial({
  //         admin: admin.publicKey,
  //         mintUsdc: mintUsdc,
  //         collegeAccount: simultaneousCollegePDAs[i],
  //         collegeAuthority: simultaneousCollegeAuthorities[i].publicKey,
  //         metaverfAccount: metaverfAccount,
  //         treasury: treasury,
  //         payerTokenAccount: simultaneousTokenAccounts[i],
  //         tokenProgram: tokenProgram,
  //         associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
  //         systemProgram: SystemProgram.programId
  //       })
  //       .signers([admin, simultaneousCollegeAuthorities[i]])
  //       .rpc({ skipPreflight: true });
      
  //     signatures.push(tx);
  //   }
    
  //   // Wait for all transactions to complete
  //   await Promise.all(signatures.map(sig => confirm(sig).then(log)));
    
  //   console.log("Multiple college registrations completed!");
    
  //   // Verify colleges were registered properly
  //   for (let i = 0; i < 2; i++) {
  //     try {
  //       const collegeData = await program.account.collegeAccount.fetch(simultaneousCollegePDAs[i]);
  //       console.log(`College ${nextCollegeIds[i]} data:`, {
  //         id: collegeData.id,
  //         authority: collegeData.authority.toString(),
  //         active: collegeData.active
  //       });
  //     } catch (err) {
  //       console.error(`Failed to fetch college ${nextCollegeIds[i]} data:`, err);
  //     }
  //   }
  // }
  // catch (error) {
  //   console.log(error)
  // }
  // });

  it("Update Parameters", async () => {
    try {

    const newAnnualFee = new BN(2e6);
    const newSubscriptionDuration = new BN(2e6);
    const tx = await program.methods
      .updateParameters(newAnnualFee, newSubscriptionDuration)
      .accountsPartial({
        admin: admin.publicKey,
        metaverfAccount: metaverfAccount,
      })
      .signers([admin])
      .rpc()
      .then(confirm)
      .then(log);

    console.log("Update Parameters signature:", tx);
    }
    catch (error) {
      console.log(error)
    }
  });

  it("Withdraw Fees", async () => {
    try {
    const amount = new BN(0); // Withdraw all fees
    const tx = await program.methods
      .withdrawFees(amount)
      .accountsPartial({
        admin: admin.publicKey,
        mintUsdc: mintUsdc,
        metaverfAccount: metaverfAccount,
        treasury: treasury,
        adminTokenAccount,
        tokenProgram: tokenProgram,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId
      })
      .signers([admin])
      .rpc()
      .then(confirm)
      .then(log);

    console.log("Withdraw success:", tx);
    }
    catch(error) {
      console.log(error)
    }
  });
});