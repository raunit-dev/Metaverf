import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Metaverf } from "../target/types/metaverf";
import { TOKEN_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  createMint,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { MPL_CORE_PROGRAM_ID } from "@metaplex-foundation/mpl-core";
import { BN } from "bn.js";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplCore } from "@metaplex-foundation/mpl-core";

describe("metaverf", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider();
  const connection = provider.connection;

  // Umi instance for Metaplex interactions
  const umi = createUmi("http://api.devenet.solana.com").use(mplCore());

  // Constants
  const annualFee = new BN(1e4);
  const subscriptionDuration = new BN(1e6);
  // Changed to 1 college only
  const totalColleges = 1;

  // Keypairs and Public Keys
  let admin: Keypair;
  let treasury: PublicKey;
  let mintUsdc: PublicKey;
  let adminTokenAccount: PublicKey;
  let studentWallet1: Keypair;
  let studentWallet2: Keypair;
  let studentWallet3: Keypair;
  let collegeAuthority: Keypair;
  let payerTokenAccount: PublicKey;
  let collection1: Keypair;
  let collection2: Keypair;
  let collection3: Keypair;
  let asset1: Keypair;
  let asset2: Keypair;
  let asset3: Keypair;


  // Program IDs
  const program = anchor.workspace.Metaverf as Program<Metaverf>;
  const programId = program.programId;
  const tokenProgram = TOKEN_PROGRAM_ID;

  // PDAs
  const [metaverfAccount, metaverfBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("protocol")],
    program.programId
  );

  // Helper Functions
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

  before(async () => {
    // Initialize admin account
    admin = Keypair.generate();
    const transferIx = SystemProgram.transfer({
      fromPubkey: provider.publicKey,
      toPubkey: admin.publicKey,
      lamports: 0.001 * LAMPORTS_PER_SOL,
    });
    const tx = new Transaction().add(transferIx);
    await provider.sendAndConfirm(tx);

    // Initialize one college authority
    collegeAuthority = Keypair.generate();
    const authorityTransferIx = SystemProgram.transfer({
      fromPubkey: provider.publicKey,
      toPubkey: collegeAuthority.publicKey,
      lamports: 0.001 * LAMPORTS_PER_SOL,
    });
    const authorityTx = new Transaction().add(authorityTransferIx);
    await provider.sendAndConfirm(authorityTx);

    // Initialize one student wallet
    studentWallet1 = anchor.web3.Keypair.generate();
    const studentTransaction1 = new anchor.web3.Transaction().add(
      anchor.web3.SystemProgram.transfer({
        fromPubkey: provider.publicKey,
        toPubkey: studentWallet1.publicKey,
        lamports: 0.001 * LAMPORTS_PER_SOL,
      })
    );
    await provider.sendAndConfirm(studentTransaction1);

    //

    studentWallet2 = anchor.web3.Keypair.generate();
    const studentTransaction2 = new anchor.web3.Transaction().add(
      anchor.web3.SystemProgram.transfer({
        fromPubkey: provider.publicKey,
        toPubkey: studentWallet2.publicKey,
        lamports: 0.001 * LAMPORTS_PER_SOL,
      })
    );
    await provider.sendAndConfirm(studentTransaction2);

    studentWallet3 = anchor.web3.Keypair.generate();
    const studentTransaction3 = new anchor.web3.Transaction().add(
      anchor.web3.SystemProgram.transfer({
        fromPubkey: provider.publicKey,
        toPubkey: studentWallet3.publicKey,
        lamports: 0.001 * LAMPORTS_PER_SOL,
      })
    );
    await provider.sendAndConfirm(studentTransaction3);

    // Initialize one asset keypair
    asset1 = Keypair.generate();
    asset2 = Keypair.generate();
    asset3 = Keypair.generate();
    // asset1 = Keypair.generate();
    // asset1 = Keypair.generate();
    // asset1 = Keypair.generate();
    // asset1 = Keypair.generate();
    // asset1 = Keypair.generate();
    // asset1 = Keypair.generate();
    // asset1 = Keypair.generate();
    

    


    // const assetTransaction = new anchor.web3.Transaction().add(
    //   anchor.web3.SystemProgram.transfer({
    //     fromPubkey: provider.publicKey,
    //     toPubkey: asset.publicKey,
    //     lamports: 40000000,
    //   })
    // );
    // await provider.sendAndConfirm(assetTransaction);

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

    // Create token account for college authority and mint tokens to it
    payerTokenAccount = (await getOrCreateAssociatedTokenAccount(
      provider.connection,
      admin,
      mintUsdc,
      collegeAuthority.publicKey,
      false
    )).address;

    // Mint USDC to college authority
    await mintTo(
      provider.connection,
      admin,
      mintUsdc,
      payerTokenAccount,
      admin,
      1000000
    );

    // Mint USDC to admin
    await mintTo(
      provider.connection,
      admin,
      mintUsdc,
      adminTokenAccount,
      admin,
      1000000
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
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc()
        .then(confirm)
        .then(log);

      console.log("Protocol initialization signature:", tx);
    } catch (error) {
      if (error instanceof anchor.web3.SendTransactionError) {
        console.log("Detailed error:", error.logs);
      } else {
        console.log(error);
      }
    }
  });

  it("Register College", async () => {
    try {
      const collegeId = 1;

      // Derive PDA for this specific college ID
      const [collegeAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("college"), new Uint8Array([collegeId, 0])], // le bytes for u16
        program.programId
      );

      const tx = await program.methods
        .registerCollege(collegeId)
        .accountsPartial({
          admin: admin.publicKey,
          mintUsdc: mintUsdc,
          collegeAccount: collegeAccount,
          collegeAuthority: collegeAuthority.publicKey,
          metaverfAccount: metaverfAccount,
          treasury: treasury,
          payerTokenAccount: payerTokenAccount,
          tokenProgram: tokenProgram,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin, collegeAuthority])
        .rpc({ skipPreflight: true })
        .then(confirm)
        .then(log);

      console.log(`Register College signature:`, tx);
    } catch (error) {
      if (error instanceof anchor.web3.SendTransactionError) {
        console.log("Detailed error:", error.logs);
      } else {
        console.log(error);
      }
    }
  });

  it("Renew Subscription College", async () => {
    try {
      const collegeId = 1;

      // Use the same PDA derivation as in registration
      const [collegeAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("college"), new Uint8Array([collegeId, 0])],
        program.programId
      );

      const tx = await program.methods
        .renewSubscription(collegeId)
        .accountsPartial({
          admin: admin.publicKey,
          mintUsdc: mintUsdc,
          collegeAccount: collegeAccount,
          collegeAuthority: collegeAuthority.publicKey,
          metaverfAccount: metaverfAccount,
          treasury: treasury,
          payerTokenAccount: payerTokenAccount,
          tokenProgram: tokenProgram,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin, collegeAuthority])
        .rpc()
        .then(confirm)
        .then(log);

      console.log(`Renew Subscription College signature:`, tx);
    } catch (error) {
      if (error instanceof anchor.web3.SendTransactionError) {
        console.log("Detailed error:", error.logs);
      } else {
        console.log(error);
      }
    }
  });

  // it("Withdraw Fees 1st time", async () => {
  //   try {
  //     const amount = new BN(10); // Withdraw all fees
  //     const tx = await program.methods
  //       .withdrawFees(amount)
  //       .accountsPartial({
  //         admin: admin.publicKey,
  //         mintUsdc: mintUsdc,
  //         metaverfAccount: metaverfAccount,
  //         treasury: treasury,
  //         adminTokenAccount,
  //         tokenProgram: tokenProgram,
  //         associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
  //         systemProgram: SystemProgram.programId,
  //       })
  //       .signers([admin])
  //       .rpc()
  //       .then(confirm)
  //       .then(log);

  //     console.log("Withdraw success:", tx);
  //   } catch (error) {
  //     console.log(error);
  //   }
  // });

  it("Add collection1 to college", async () => {
    try {
      const collegeId = 1;

      const [collegeAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("college"), new Uint8Array([collegeId, 0])],
        program.programId
      );

      // Create a new collection
      collection1 = Keypair.generate();

      const args = {
        name: "TEST COLLECTION",
        uri: "https://example.com/event",
      };

      const tx = await program.methods
        .addCollection(collegeId, args)
        .accountsStrict({
          collegeAccount: collegeAccount,
          collegeAuthority: collegeAuthority.publicKey,
          mplCoreProgram: MPL_CORE_PROGRAM_ID,
          newCollection: collection1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([collegeAuthority, collection1])
        .rpc({ skipPreflight: true }) // Add skipPreflight for diagnostics
        .catch(error => {
          if (error instanceof anchor.web3.SendTransactionError) {
            console.log("Detailed error:", error.logs);
          }
          throw error;
        })
        .then(confirm)
        .then(log);
        
      console.log(`Add collection to college signature:`, tx);
    } catch (error) {
      console.log(error);
    }
  });

  // it("Add collection2 to college", async () => {
  //   try {
  //     const collegeId = 1;

  //     const [collegeAccount] = PublicKey.findProgramAddressSync(
  //       [Buffer.from("college"), new Uint8Array([collegeId, 0])],
  //       program.programId
  //     );

  //     // Create a new collection
  //     collection2 = Keypair.generate();

  //     const args = {
  //       name: "TEST COLLECTION",
  //       uri: "https://example.com/event",
  //     };

  //     const tx = await program.methods
  //       .addCollection(collegeId, args)
  //       .accountsStrict({
  //         collegeAccount: collegeAccount,
  //         collegeAuthority: collegeAuthority.publicKey,
  //         mplCoreProgram: MPL_CORE_PROGRAM_ID,
  //         newCollection: collection2.publicKey,
  //         systemProgram: SystemProgram.programId,
  //       })
  //       .signers([collegeAuthority, collection2])
  //       .rpc({ skipPreflight: true }) // Add skipPreflight for diagnostics
  //       .catch(error => {
  //         if (error instanceof anchor.web3.SendTransactionError) {
  //           console.log("Detailed error:", error.logs);
  //         }
  //         throw error;
  //       })
  //       .then(confirm)
  //       .then(log);
        
  //     console.log(`Add collection to college signature:`, tx);
  //   } catch (error) {
  //     console.log(error);
  //   }
  // });

  it("Minting Certificates for Student1 under collection1", async () => {
    try {
      const collegeId = 1;

      const [collegeAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("college"), new Uint8Array([collegeId, 0])],
        program.programId
      );

      // Generate unique certificate data
      const args = {
        name: "TEST ASSET",
        uri: "https://example.com/event",
        studentName: "STUDENT NAME",
        courseName: "Turbine",
        completionDate: "15 feb",
        grade: "1st year",
      };

      // Debug information for verification
      // console.log("Collection public key:", collection.publicKey.toBase58());
      // console.log("Asset public key:", asset.publicKey.toBase58());
      // console.log("Student wallet public key:", studentWallet.publicKey.toBase58());

      const tx = await program.methods
        .mintCertificate(collegeId, args)
        .accountsStrict({
          collegeAccount: collegeAccount,
          collegeAuthority: collegeAuthority.publicKey,
          mplCoreProgram: MPL_CORE_PROGRAM_ID,
          collection: collection1.publicKey,
          systemProgram: SystemProgram.programId,
          asset: asset1.publicKey,
          studentWallet: studentWallet1.publicKey,
        })
        .signers([collegeAuthority, asset1, studentWallet1])
        .rpc({ skipPreflight: true })
        .catch(error => {
          if (error instanceof anchor.web3.SendTransactionError) {
            console.log("Detailed error logs:", error.logs);
  // Try to read any program-generated errors
  const programErrors = error.logs?.filter(log => 
    log.includes("Program log:") && log.includes("Error")
  );
  if (programErrors?.length) console.log("Program errors:", programErrors);
          }
          throw error;
        })
        .then(confirm)
        .then(log);
        
      console.log(`Add asset to college signature:`, tx);
    } catch (error) {
      console.log("Failed to mint certificate:", error);
    }
  });

  it("Minting Certificates for Student2 under Collection1", async () => {
    try {
      const collegeId = 1;

      const [collegeAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("college"), new Uint8Array([collegeId, 0])],
        program.programId
      );

      // Generate unique certificate data
      const args = {
        name: "TEST ASSET",
        uri: "https://example.com/event",
        studentName: "raunit",
        courseName: "Turbine",
        completionDate: "15 feb",
        grade: "1st year",
      };

      // Debug information for verification
      // console.log("Collection public key:", collection.publicKey.toBase58());
      // console.log("Asset public key:", asset.publicKey.toBase58());
      // console.log("Student wallet public key:", studentWallet.publicKey.toBase58());

      const tx = await program.methods
        .mintCertificate(collegeId, args)
        .accountsStrict({
          collegeAccount: collegeAccount,
          collegeAuthority: collegeAuthority.publicKey,
          mplCoreProgram: MPL_CORE_PROGRAM_ID,
          collection: collection1.publicKey,
          systemProgram: SystemProgram.programId,
          asset: asset2.publicKey,
          studentWallet: studentWallet2.publicKey,
        })
        .signers([collegeAuthority, asset2, studentWallet2])
        .rpc({ skipPreflight: true })
        .catch(error => {
          if (error instanceof anchor.web3.SendTransactionError) {
            console.log("Detailed error logs:", error.logs);
  // Try to read any program-generated errors
  const programErrors = error.logs?.filter(log => 
    log.includes("Program log:") && log.includes("Error")
  );
  if (programErrors?.length) console.log("Program errors:", programErrors);
          }
          throw error;
        })
        .then(confirm)
        .then(log);
        
      console.log(`Add asset to college signature:`, tx);
    } catch (error) {
      console.log("Failed to mint certificate:", error);
    }
  });


  it("Minting Certificates for Student3 under collection1", async () => {
    try {
      const collegeId = 1;

      const [collegeAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("college"), new Uint8Array([collegeId, 0])],
        program.programId
      );

      // Generate unique certificate data
      const args = {
        name: "TEST ASSET",
        uri: "https://example.com/event",
        studentName: "raunit",
        courseName: "Turbine",
        completionDate: "15 feb",
        grade: "1st year",
      };

      // Debug information for verification
      // console.log("Collection public key:", collection.publicKey.toBase58());
      // console.log("Asset public key:", asset.publicKey.toBase58());
      // console.log("Student wallet public key:", studentWallet.publicKey.toBase58());

      const tx = await program.methods
        .mintCertificate(collegeId, args)
        .accountsStrict({
          collegeAccount: collegeAccount,
          collegeAuthority: collegeAuthority.publicKey,
          mplCoreProgram: MPL_CORE_PROGRAM_ID,
          collection: collection1.publicKey,
          systemProgram: SystemProgram.programId,
          asset: asset3.publicKey,
          studentWallet: studentWallet3.publicKey,
        })
        .signers([collegeAuthority, asset3, studentWallet3])
        .rpc({ skipPreflight: true })
        .catch(error => {
          if (error instanceof anchor.web3.SendTransactionError) {
            console.log("Detailed error logs:", error.logs);
  // Try to read any program-generated errors
  const programErrors = error.logs?.filter(log => 
    log.includes("Program log:") && log.includes("Error")
  );
  if (programErrors?.length) console.log("Program errors:", programErrors);
          }
          throw error;
        })
        .then(confirm)
        .then(log);
        
      console.log(`Add asset to college signature:`, tx);
    } catch (error) {
      console.log("Failed to mint certificate:", error);
    }
  });


  // it("Withdraw Fees 2nd time", async () => {
  //   try {
  //     const amount = new BN(10); // Withdraw all fees
  //     const tx = await program.methods
  //       .withdrawFees(amount)
  //       .accountsPartial({
  //         admin: admin.publicKey,
  //         mintUsdc: mintUsdc,
  //         metaverfAccount: metaverfAccount,
  //         treasury: treasury,
  //         adminTokenAccount,
  //         tokenProgram: tokenProgram,
  //         associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
  //         systemProgram: SystemProgram.programId,
  //       })
  //       .signers([admin])
  //       .rpc()
  //       .then(confirm)
  //       .then(log);

  //     console.log("Withdraw success:", tx);
  //   } catch (error) {
  //     console.log(error);
  //   }
  // });

  // it("Minting Certificates for Student1 under collection2", async () => {
  //   try {
  //     const collegeId = 1;

  //     const [collegeAccount] = PublicKey.findProgramAddressSync(
  //       [Buffer.from("college"), new Uint8Array([collegeId, 0])],
  //       program.programId
  //     );

  //     // Generate unique certificate data
  //     const args = {
  //       name: "TEST ASSET",
  //       uri: "https://example.com/event",
  //       studentName: "STUDENT NAME",
  //       courseName: "Turbine",
  //       completionDate: "15 feb",
  //       grade: "1st year",
  //     };

  //     // Debug information for verification
  //     // console.log("Collection public key:", collection.publicKey.toBase58());
  //     // console.log("Asset public key:", asset.publicKey.toBase58());
  //     // console.log("Student wallet public key:", studentWallet.publicKey.toBase58());

  //     const tx = await program.methods
  //       .mintCertificate(collegeId, args)
  //       .accountsStrict({
  //         collegeAccount: collegeAccount,
  //         collegeAuthority: collegeAuthority.publicKey,
  //         mplCoreProgram: MPL_CORE_PROGRAM_ID,
  //         collection: collection2.publicKey,
  //         systemProgram: SystemProgram.programId,
  //         asset: asset1.publicKey,
  //         studentWallet: studentWallet1.publicKey,
  //       })
  //       .signers([collegeAuthority, asset1, studentWallet1])
  //       .rpc({ skipPreflight: true })
  //       .catch(error => {
  //         if (error instanceof anchor.web3.SendTransactionError) {
  //           console.log("Detailed error logs:", error.logs);
  // // Try to read any program-generated errors
  // const programErrors = error.logs?.filter(log => 
  //   log.includes("Program log:") && log.includes("Error")
  // );
  // if (programErrors?.length) console.log("Program errors:", programErrors);
  //         }
  //         throw error;
  //       })
  //       .then(confirm)
  //       .then(log);
        
  //     console.log(`Add asset to college signature:`, tx);
  //   } catch (error) {
  //     console.log("Failed to mint certificate:", error);
  //   }
  // });

  // it("Minting Certificates for Student2 under Collection2", async () => {
  //   try {
  //     const collegeId = 1;

  //     const [collegeAccount] = PublicKey.findProgramAddressSync(
  //       [Buffer.from("college"), new Uint8Array([collegeId, 0])],
  //       program.programId
  //     );

  //     // Generate unique certificate data
  //     const args = {
  //       name: "TEST ASSET",
  //       uri: "https://example.com/event",
  //       studentName: "raunit",
  //       courseName: "Turbine",
  //       completionDate: "15 feb",
  //       grade: "1st year",
  //     };

  //     // Debug information for verification
  //     // console.log("Collection public key:", collection.publicKey.toBase58());
  //     // console.log("Asset public key:", asset.publicKey.toBase58());
  //     // console.log("Student wallet public key:", studentWallet.publicKey.toBase58());

  //     const tx = await program.methods
  //       .mintCertificate(collegeId, args)
  //       .accountsStrict({
  //         collegeAccount: collegeAccount,
  //         collegeAuthority: collegeAuthority.publicKey,
  //         mplCoreProgram: MPL_CORE_PROGRAM_ID,
  //         collection: collection2.publicKey,
  //         systemProgram: SystemProgram.programId,
  //         asset: asset2.publicKey,
  //         studentWallet: studentWallet2.publicKey,
  //       })
  //       .signers([collegeAuthority, asset2, studentWallet2])
  //       .rpc({ skipPreflight: true })
  //       .catch(error => {
  //         if (error instanceof anchor.web3.SendTransactionError) {
  //           console.log("Detailed error logs:", error.logs);
  // // Try to read any program-generated errors
  // const programErrors = error.logs?.filter(log => 
  //   log.includes("Program log:") && log.includes("Error")
  // );
  // if (programErrors?.length) console.log("Program errors:", programErrors);
  //         }
  //         throw error;
  //       })
  //       .then(confirm)
  //       .then(log);
        
  //     console.log(`Add asset to college signature:`, tx);
  //   } catch (error) {
  //     console.log("Failed to mint certificate:", error);
  //   }
  // });


  // it("Minting Certificates for Student3 under Collection2", async () => {
  //   try {
  //     const collegeId = 1;

  //     const [collegeAccount] = PublicKey.findProgramAddressSync(
  //       [Buffer.from("college"), new Uint8Array([collegeId, 0])],
  //       program.programId
  //     );

  //     // Generate unique certificate data
  //     const args = {
  //       name: "TEST ASSET",
  //       uri: "https://example.com/event",
  //       studentName: "raunit",
  //       courseName: "Turbine",
  //       completionDate: "15 feb",
  //       grade: "1st year",
  //     };

  //     // Debug information for verification
  //     // console.log("Collection public key:", collection.publicKey.toBase58());
  //     // console.log("Asset public key:", asset.publicKey.toBase58());
  //     // console.log("Student wallet public key:", studentWallet.publicKey.toBase58());

  //     const tx = await program.methods
  //       .mintCertificate(collegeId, args)
  //       .accountsStrict({
  //         collegeAccount: collegeAccount,
  //         collegeAuthority: collegeAuthority.publicKey,
  //         mplCoreProgram: MPL_CORE_PROGRAM_ID,
  //         collection: collection2.publicKey,
  //         systemProgram: SystemProgram.programId,
  //         asset: asset3.publicKey,
  //         studentWallet: studentWallet3.publicKey,
  //       })
  //       .signers([collegeAuthority, asset3, studentWallet3])
  //       .rpc({ skipPreflight: true })
  //       .catch(error => {
  //         if (error instanceof anchor.web3.SendTransactionError) {
  //           console.log("Detailed error logs:", error.logs);
  // // Try to read any program-generated errors
  // const programErrors = error.logs?.filter(log => 
  //   log.includes("Program log:") && log.includes("Error")
  // );
  // if (programErrors?.length) console.log("Program errors:", programErrors);
  //         }
  //         throw error;
  //       })
  //       .then(confirm)
  //       .then(log);
        
  //     console.log(`Add asset to college signature:`, tx);
  //   } catch (error) {
  //     console.log("Failed to mint certificate:", error);
  //   }
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
    } catch (error) {
      console.log(error);
    }
  });

  it("Withdraw Fees last time", async () => {
    try {
      const amount = new BN(10); // Withdraw all fees
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
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc()
        .then(confirm)
        .then(log);

      console.log("Withdraw success:", tx);
    } catch (error) {
      console.log(error);
    }
  });




//TODO PARAMETERS ARE NOT CHANGED ITS AN HECTIC TASK probably will use AI

  // it("Register College", async () => {
  //   try {
  //     const collegeId = 1;

  //     // Derive PDA for this specific college ID
  //     const [collegeAccount] = PublicKey.findProgramAddressSync(
  //       [Buffer.from("college"), new Uint8Array([collegeId, 0])], // le bytes for u16
  //       program.programId
  //     );

  //     const tx = await program.methods
  //       .registerCollege(collegeId)
  //       .accountsPartial({
  //         admin: admin.publicKey,
  //         mintUsdc: mintUsdc,
  //         collegeAccount: collegeAccount,
  //         collegeAuthority: collegeAuthority.publicKey,
  //         metaverfAccount: metaverfAccount,
  //         treasury: treasury,
  //         payerTokenAccount: payerTokenAccount,
  //         tokenProgram: tokenProgram,
  //         associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
  //         systemProgram: SystemProgram.programId,
  //       })
  //       .signers([admin, collegeAuthority])
  //       .rpc({ skipPreflight: true })
  //       .then(confirm)
  //       .then(log);

  //     console.log(`Register College signature:`, tx);
  //   } catch (error) {
  //     if (error instanceof anchor.web3.SendTransactionError) {
  //       console.log("Detailed error:", error.logs);
  //     } else {
  //       console.log(error);
  //     }
  //   }
  // });

  // it("Renew Subscription College", async () => {
  //   try {
  //     const collegeId = 1;

  //     // Use the same PDA derivation as in registration
  //     const [collegeAccount] = PublicKey.findProgramAddressSync(
  //       [Buffer.from("college"), new Uint8Array([collegeId, 0])],
  //       program.programId
  //     );

  //     const tx = await program.methods
  //       .renewSubscription(collegeId)
  //       .accountsPartial({
  //         admin: admin.publicKey,
  //         mintUsdc: mintUsdc,
  //         collegeAccount: collegeAccount,
  //         collegeAuthority: collegeAuthority.publicKey,
  //         metaverfAccount: metaverfAccount,
  //         treasury: treasury,
  //         payerTokenAccount: payerTokenAccount,
  //         tokenProgram: tokenProgram,
  //         associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
  //         systemProgram: SystemProgram.programId,
  //       })
  //       .signers([admin, collegeAuthority])
  //       .rpc()
  //       .then(confirm)
  //       .then(log);

  //     console.log(`Renew Subscription College signature:`, tx);
  //   } catch (error) {
  //     if (error instanceof anchor.web3.SendTransactionError) {
  //       console.log("Detailed error:", error.logs);
  //     } else {
  //       console.log(error);
  //     }
  //   }
  // });

  // // it("Withdraw Fees 1st time", async () => {
  // //   try {
  // //     const amount = new BN(10); // Withdraw all fees
  // //     const tx = await program.methods
  // //       .withdrawFees(amount)
  // //       .accountsPartial({
  // //         admin: admin.publicKey,
  // //         mintUsdc: mintUsdc,
  // //         metaverfAccount: metaverfAccount,
  // //         treasury: treasury,
  // //         adminTokenAccount,
  // //         tokenProgram: tokenProgram,
  // //         associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
  // //         systemProgram: SystemProgram.programId,
  // //       })
  // //       .signers([admin])
  // //       .rpc()
  // //       .then(confirm)
  // //       .then(log);

  // //     console.log("Withdraw success:", tx);
  // //   } catch (error) {
  // //     console.log(error);
  // //   }
  // // });

  // it("Add collection1 to college", async () => {
  //   try {
  //     const collegeId = 1;

  //     const [collegeAccount] = PublicKey.findProgramAddressSync(
  //       [Buffer.from("college"), new Uint8Array([collegeId, 0])],
  //       program.programId
  //     );

  //     // Create a new collection
  //     collection1 = Keypair.generate();

  //     const args = {
  //       name: "TEST COLLECTION",
  //       uri: "https://example.com/event",
  //     };

  //     const tx = await program.methods
  //       .addCollection(collegeId, args)
  //       .accountsStrict({
  //         collegeAccount: collegeAccount,
  //         collegeAuthority: collegeAuthority.publicKey,
  //         mplCoreProgram: MPL_CORE_PROGRAM_ID,
  //         newCollection: collection1.publicKey,
  //         systemProgram: SystemProgram.programId,
  //       })
  //       .signers([collegeAuthority, collection1])
  //       .rpc({ skipPreflight: true }) // Add skipPreflight for diagnostics
  //       .catch(error => {
  //         if (error instanceof anchor.web3.SendTransactionError) {
  //           console.log("Detailed error:", error.logs);
  //         }
  //         throw error;
  //       })
  //       .then(confirm)
  //       .then(log);
        
  //     console.log(`Add collection to college signature:`, tx);
  //   } catch (error) {
  //     console.log(error);
  //   }
  // });

  // // it("Add collection2 to college", async () => {
  // //   try {
  // //     const collegeId = 1;

  // //     const [collegeAccount] = PublicKey.findProgramAddressSync(
  // //       [Buffer.from("college"), new Uint8Array([collegeId, 0])],
  // //       program.programId
  // //     );

  // //     // Create a new collection
  // //     collection2 = Keypair.generate();

  // //     const args = {
  // //       name: "TEST COLLECTION",
  // //       uri: "https://example.com/event",
  // //     };

  // //     const tx = await program.methods
  // //       .addCollection(collegeId, args)
  // //       .accountsStrict({
  // //         collegeAccount: collegeAccount,
  // //         collegeAuthority: collegeAuthority.publicKey,
  // //         mplCoreProgram: MPL_CORE_PROGRAM_ID,
  // //         newCollection: collection2.publicKey,
  // //         systemProgram: SystemProgram.programId,
  // //       })
  // //       .signers([collegeAuthority, collection2])
  // //       .rpc({ skipPreflight: true }) // Add skipPreflight for diagnostics
  // //       .catch(error => {
  // //         if (error instanceof anchor.web3.SendTransactionError) {
  // //           console.log("Detailed error:", error.logs);
  // //         }
  // //         throw error;
  // //       })
  // //       .then(confirm)
  // //       .then(log);
        
  // //     console.log(`Add collection to college signature:`, tx);
  // //   } catch (error) {
  // //     console.log(error);
  // //   }
  // // });

  // it("Minting Certificates for Student1 under collection1", async () => {
  //   try {
  //     const collegeId = 1;

  //     const [collegeAccount] = PublicKey.findProgramAddressSync(
  //       [Buffer.from("college"), new Uint8Array([collegeId, 0])],
  //       program.programId
  //     );

  //     // Generate unique certificate data
  //     const args = {
  //       name: "TEST ASSET",
  //       uri: "https://example.com/event",
  //       studentName: "STUDENT NAME",
  //       courseName: "Turbine",
  //       completionDate: "15 feb",
  //       grade: "1st year",
  //     };

  //     // Debug information for verification
  //     // console.log("Collection public key:", collection.publicKey.toBase58());
  //     // console.log("Asset public key:", asset.publicKey.toBase58());
  //     // console.log("Student wallet public key:", studentWallet.publicKey.toBase58());

  //     const tx = await program.methods
  //       .mintCertificate(collegeId, args)
  //       .accountsStrict({
  //         collegeAccount: collegeAccount,
  //         collegeAuthority: collegeAuthority.publicKey,
  //         mplCoreProgram: MPL_CORE_PROGRAM_ID,
  //         collection: collection1.publicKey,
  //         systemProgram: SystemProgram.programId,
  //         asset: asset1.publicKey,
  //         studentWallet: studentWallet1.publicKey,
  //       })
  //       .signers([collegeAuthority, asset1, studentWallet1])
  //       .rpc({ skipPreflight: true })
  //       .catch(error => {
  //         if (error instanceof anchor.web3.SendTransactionError) {
  //           console.log("Detailed error logs:", error.logs);
  // // Try to read any program-generated errors
  // const programErrors = error.logs?.filter(log => 
  //   log.includes("Program log:") && log.includes("Error")
  // );
  // if (programErrors?.length) console.log("Program errors:", programErrors);
  //         }
  //         throw error;
  //       })
  //       .then(confirm)
  //       .then(log);
        
  //     console.log(`Add asset to college signature:`, tx);
  //   } catch (error) {
  //     console.log("Failed to mint certificate:", error);
  //   }
  // });

  // it("Minting Certificates for Student2 under Collection1", async () => {
  //   try {
  //     const collegeId = 1;

  //     const [collegeAccount] = PublicKey.findProgramAddressSync(
  //       [Buffer.from("college"), new Uint8Array([collegeId, 0])],
  //       program.programId
  //     );

  //     // Generate unique certificate data
  //     const args = {
  //       name: "TEST ASSET",
  //       uri: "https://example.com/event",
  //       studentName: "raunit",
  //       courseName: "Turbine",
  //       completionDate: "15 feb",
  //       grade: "1st year",
  //     };

  //     // Debug information for verification
  //     // console.log("Collection public key:", collection.publicKey.toBase58());
  //     // console.log("Asset public key:", asset.publicKey.toBase58());
  //     // console.log("Student wallet public key:", studentWallet.publicKey.toBase58());

  //     const tx = await program.methods
  //       .mintCertificate(collegeId, args)
  //       .accountsStrict({
  //         collegeAccount: collegeAccount,
  //         collegeAuthority: collegeAuthority.publicKey,
  //         mplCoreProgram: MPL_CORE_PROGRAM_ID,
  //         collection: collection1.publicKey,
  //         systemProgram: SystemProgram.programId,
  //         asset: asset2.publicKey,
  //         studentWallet: studentWallet2.publicKey,
  //       })
  //       .signers([collegeAuthority, asset2, studentWallet2])
  //       .rpc({ skipPreflight: true })
  //       .catch(error => {
  //         if (error instanceof anchor.web3.SendTransactionError) {
  //           console.log("Detailed error logs:", error.logs);
  // // Try to read any program-generated errors
  // const programErrors = error.logs?.filter(log => 
  //   log.includes("Program log:") && log.includes("Error")
  // );
  // if (programErrors?.length) console.log("Program errors:", programErrors);
  //         }
  //         throw error;
  //       })
  //       .then(confirm)
  //       .then(log);
        
  //     console.log(`Add asset to college signature:`, tx);
  //   } catch (error) {
  //     console.log("Failed to mint certificate:", error);
  //   }
  // });


  // it("Minting Certificates for Student3 under collection1", async () => {
  //   try {
  //     const collegeId = 1;

  //     const [collegeAccount] = PublicKey.findProgramAddressSync(
  //       [Buffer.from("college"), new Uint8Array([collegeId, 0])],
  //       program.programId
  //     );

  //     // Generate unique certificate data
  //     const args = {
  //       name: "TEST ASSET",
  //       uri: "https://example.com/event",
  //       studentName: "raunit",
  //       courseName: "Turbine",
  //       completionDate: "15 feb",
  //       grade: "1st year",
  //     };

  //     // Debug information for verification
  //     // console.log("Collection public key:", collection.publicKey.toBase58());
  //     // console.log("Asset public key:", asset.publicKey.toBase58());
  //     // console.log("Student wallet public key:", studentWallet.publicKey.toBase58());

  //     const tx = await program.methods
  //       .mintCertificate(collegeId, args)
  //       .accountsStrict({
  //         collegeAccount: collegeAccount,
  //         collegeAuthority: collegeAuthority.publicKey,
  //         mplCoreProgram: MPL_CORE_PROGRAM_ID,
  //         collection: collection1.publicKey,
  //         systemProgram: SystemProgram.programId,
  //         asset: asset3.publicKey,
  //         studentWallet: studentWallet3.publicKey,
  //       })
  //       .signers([collegeAuthority, asset3, studentWallet3])
  //       .rpc({ skipPreflight: true })
  //       .catch(error => {
  //         if (error instanceof anchor.web3.SendTransactionError) {
  //           console.log("Detailed error logs:", error.logs);
  // // Try to read any program-generated errors
  // const programErrors = error.logs?.filter(log => 
  //   log.includes("Program log:") && log.includes("Error")
  // );
  // if (programErrors?.length) console.log("Program errors:", programErrors);
  //         }
  //         throw error;
  //       })
  //       .then(confirm)
  //       .then(log);
        
  //     console.log(`Add asset to college signature:`, tx);
  //   } catch (error) {
  //     console.log("Failed to mint certificate:", error);
  //   }
  // });


  // // it("Withdraw Fees 2nd time", async () => {
  // //   try {
  // //     const amount = new BN(10); // Withdraw all fees
  // //     const tx = await program.methods
  // //       .withdrawFees(amount)
  // //       .accountsPartial({
  // //         admin: admin.publicKey,
  // //         mintUsdc: mintUsdc,
  // //         metaverfAccount: metaverfAccount,
  // //         treasury: treasury,
  // //         adminTokenAccount,
  // //         tokenProgram: tokenProgram,
  // //         associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
  // //         systemProgram: SystemProgram.programId,
  // //       })
  // //       .signers([admin])
  // //       .rpc()
  // //       .then(confirm)
  // //       .then(log);

  // //     console.log("Withdraw success:", tx);
  // //   } catch (error) {
  // //     console.log(error);
  // //   }
  // // });

  // // it("Minting Certificates for Student1 under collection2", async () => {
  // //   try {
  // //     const collegeId = 1;

  // //     const [collegeAccount] = PublicKey.findProgramAddressSync(
  // //       [Buffer.from("college"), new Uint8Array([collegeId, 0])],
  // //       program.programId
  // //     );

  // //     // Generate unique certificate data
  // //     const args = {
  // //       name: "TEST ASSET",
  // //       uri: "https://example.com/event",
  // //       studentName: "STUDENT NAME",
  // //       courseName: "Turbine",
  // //       completionDate: "15 feb",
  // //       grade: "1st year",
  // //     };

  // //     // Debug information for verification
  // //     // console.log("Collection public key:", collection.publicKey.toBase58());
  // //     // console.log("Asset public key:", asset.publicKey.toBase58());
  // //     // console.log("Student wallet public key:", studentWallet.publicKey.toBase58());

  // //     const tx = await program.methods
  // //       .mintCertificate(collegeId, args)
  // //       .accountsStrict({
  // //         collegeAccount: collegeAccount,
  // //         collegeAuthority: collegeAuthority.publicKey,
  // //         mplCoreProgram: MPL_CORE_PROGRAM_ID,
  // //         collection: collection2.publicKey,
  // //         systemProgram: SystemProgram.programId,
  // //         asset: asset1.publicKey,
  // //         studentWallet: studentWallet1.publicKey,
  // //       })
  // //       .signers([collegeAuthority, asset1, studentWallet1])
  // //       .rpc({ skipPreflight: true })
  // //       .catch(error => {
  // //         if (error instanceof anchor.web3.SendTransactionError) {
  // //           console.log("Detailed error logs:", error.logs);
  // // // Try to read any program-generated errors
  // // const programErrors = error.logs?.filter(log => 
  // //   log.includes("Program log:") && log.includes("Error")
  // // );
  // // if (programErrors?.length) console.log("Program errors:", programErrors);
  // //         }
  // //         throw error;
  // //       })
  // //       .then(confirm)
  // //       .then(log);
        
  // //     console.log(`Add asset to college signature:`, tx);
  // //   } catch (error) {
  // //     console.log("Failed to mint certificate:", error);
  // //   }
  // // });

  // // it("Minting Certificates for Student2 under Collection2", async () => {
  // //   try {
  // //     const collegeId = 1;

  // //     const [collegeAccount] = PublicKey.findProgramAddressSync(
  // //       [Buffer.from("college"), new Uint8Array([collegeId, 0])],
  // //       program.programId
  // //     );

  // //     // Generate unique certificate data
  // //     const args = {
  // //       name: "TEST ASSET",
  // //       uri: "https://example.com/event",
  // //       studentName: "raunit",
  // //       courseName: "Turbine",
  // //       completionDate: "15 feb",
  // //       grade: "1st year",
  // //     };

  // //     // Debug information for verification
  // //     // console.log("Collection public key:", collection.publicKey.toBase58());
  // //     // console.log("Asset public key:", asset.publicKey.toBase58());
  // //     // console.log("Student wallet public key:", studentWallet.publicKey.toBase58());

  // //     const tx = await program.methods
  // //       .mintCertificate(collegeId, args)
  // //       .accountsStrict({
  // //         collegeAccount: collegeAccount,
  // //         collegeAuthority: collegeAuthority.publicKey,
  // //         mplCoreProgram: MPL_CORE_PROGRAM_ID,
  // //         collection: collection2.publicKey,
  // //         systemProgram: SystemProgram.programId,
  // //         asset: asset2.publicKey,
  // //         studentWallet: studentWallet2.publicKey,
  // //       })
  // //       .signers([collegeAuthority, asset2, studentWallet2])
  // //       .rpc({ skipPreflight: true })
  // //       .catch(error => {
  // //         if (error instanceof anchor.web3.SendTransactionError) {
  // //           console.log("Detailed error logs:", error.logs);
  // // // Try to read any program-generated errors
  // // const programErrors = error.logs?.filter(log => 
  // //   log.includes("Program log:") && log.includes("Error")
  // // );
  // // if (programErrors?.length) console.log("Program errors:", programErrors);
  // //         }
  // //         throw error;
  // //       })
  // //       .then(confirm)
  // //       .then(log);
        
  // //     console.log(`Add asset to college signature:`, tx);
  // //   } catch (error) {
  // //     console.log("Failed to mint certificate:", error);
  // //   }
  // // });


  // // it("Minting Certificates for Student3 under Collection2", async () => {
  // //   try {
  // //     const collegeId = 1;

  // //     const [collegeAccount] = PublicKey.findProgramAddressSync(
  // //       [Buffer.from("college"), new Uint8Array([collegeId, 0])],
  // //       program.programId
  // //     );

  // //     // Generate unique certificate data
  // //     const args = {
  // //       name: "TEST ASSET",
  // //       uri: "https://example.com/event",
  // //       studentName: "raunit",
  // //       courseName: "Turbine",
  // //       completionDate: "15 feb",
  // //       grade: "1st year",
  // //     };

  // //     // Debug information for verification
  // //     // console.log("Collection public key:", collection.publicKey.toBase58());
  // //     // console.log("Asset public key:", asset.publicKey.toBase58());
  // //     // console.log("Student wallet public key:", studentWallet.publicKey.toBase58());

  // //     const tx = await program.methods
  // //       .mintCertificate(collegeId, args)
  // //       .accountsStrict({
  // //         collegeAccount: collegeAccount,
  // //         collegeAuthority: collegeAuthority.publicKey,
  // //         mplCoreProgram: MPL_CORE_PROGRAM_ID,
  // //         collection: collection2.publicKey,
  // //         systemProgram: SystemProgram.programId,
  // //         asset: asset3.publicKey,
  // //         studentWallet: studentWallet3.publicKey,
  // //       })
  // //       .signers([collegeAuthority, asset3, studentWallet3])
  // //       .rpc({ skipPreflight: true })
  // //       .catch(error => {
  // //         if (error instanceof anchor.web3.SendTransactionError) {
  // //           console.log("Detailed error logs:", error.logs);
  // // // Try to read any program-generated errors
  // // const programErrors = error.logs?.filter(log => 
  // //   log.includes("Program log:") && log.includes("Error")
  // // );
  // // if (programErrors?.length) console.log("Program errors:", programErrors);
  // //         }
  // //         throw error;
  // //       })
  // //       .then(confirm)
  // //       .then(log);
        
  // //     console.log(`Add asset to college signature:`, tx);
  // //   } catch (error) {
  // //     console.log("Failed to mint certificate:", error);
  // //   }
  // // });


  // it("Update Parameters 2nd time", async () => {
  //   try {
  //     const newAnnualFee = new BN(2e6);
  //     const newSubscriptionDuration = new BN(2e6);
  //     const tx = await program.methods
  //       .updateParameters(newAnnualFee, newSubscriptionDuration)
  //       .accountsPartial({
  //         admin: admin.publicKey,
  //         metaverfAccount: metaverfAccount,
  //       })
  //       .signers([admin])
  //       .rpc()
  //       .then(confirm)
  //       .then(log);

  //     console.log("Update Parameters signature:", tx);
  //   } catch (error) {
  //     console.log(error);
  //   }
  // });

  // it("Withdraw Fees last time", async () => {
  //   try {
  //     const amount = new BN(10); // Withdraw all fees
  //     const tx = await program.methods
  //       .withdrawFees(amount)
  //       .accountsPartial({
  //         admin: admin.publicKey,
  //         mintUsdc: mintUsdc,
  //         metaverfAccount: metaverfAccount,
  //         treasury: treasury,
  //         adminTokenAccount,
  //         tokenProgram: tokenProgram,
  //         associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
  //         systemProgram: SystemProgram.programId,
  //       })
  //       .signers([admin])
  //       .rpc()
  //       .then(confirm)
  //       .then(log);

  //     console.log("Withdraw success:", tx);
  //   } catch (error) {
  //     console.log(error);
  //   }
  // });



});