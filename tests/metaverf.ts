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
  getOrCreateAssociatedTokenAccount,
  mintTo,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { MPL_CORE_PROGRAM_ID } from "@metaplex-foundation/mpl-core";
import { BN } from "bn.js";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplCore } from "@metaplex-foundation/mpl-core";
import { assert } from "chai";

describe("metaverf", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider();
  const connection = provider.connection;

  // Umi instance for Metaplex interactions
  const umi = createUmi("http://api.devenet.solana.com").use(mplCore());

  // Constants
  const annualFee = new BN(1e6);
  const subscriptionDuration = new BN(1e6);
  const totalColleges = 3;

  // Keypairs and Public Keys
  let admin: Keypair;
  let treasury: PublicKey;
  let mintUsdc: PublicKey;
  let adminTokenAccount: PublicKey;
  let studentWallet1: Keypair;

  // Arrays to hold multiple keypairs/accounts
  const studentWallets: Keypair[] = [];
  const collegeAuthorities: Keypair[] = [];
  const payerTokenAccounts: PublicKey[] = [];
  const collections: Keypair[] = [];

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
      lamports: 10 * LAMPORTS_PER_SOL,
    });
    const tx = new Transaction().add(transferIx);
    await provider.sendAndConfirm(tx);

    // Initialize student wallet
    studentWallet1 = anchor.web3.Keypair.generate();
    const transaction = new anchor.web3.Transaction().add(
      anchor.web3.SystemProgram.transfer({
        fromPubkey: provider.publicKey,
        toPubkey: studentWallet1.publicKey,
        lamports: 40000000,
      })
    );
    await provider.sendAndConfirm(transaction);

    // Initialize college authorities and student wallets
    for (let i = 0; i < totalColleges; i++) {
      // Initialize student wallets
      const studentWallet = anchor.web3.Keypair.generate();
      studentWallets.push(studentWallet);
      const transaction = new anchor.web3.Transaction().add(
        anchor.web3.SystemProgram.transfer({
          fromPubkey: provider.publicKey,
          toPubkey: studentWallet.publicKey,
          lamports: 40000000,
        })
      );
      await provider.sendAndConfirm(transaction);

      // Initialize college authorities
      collegeAuthorities.push(Keypair.generate());
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
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc()
        .then(confirm)
        .then(log);

      console.log("Protocol initialization signature:", tx);
    } catch (error) {
      console.log(error);
    }
  });

  // Loop through each college for registration, renewal, and adding collections
  for (let i = 0; i < totalColleges; i++) {
    it(`Register College ${i + 1}`, async () => {
      try {
        const collegeId = i + 1;

        // Derive PDA for this specific college ID
        const [collegeAccount] = PublicKey.findProgramAddressSync(
          [Buffer.from("college"), new Uint8Array([collegeId, 0])], // le bytes for u16
          program.programId
        );

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
            systemProgram: SystemProgram.programId,
          })
          .signers([admin, collegeAuthorities[i]])
          .rpc({ skipPreflight: true })
          .then(confirm)
          .then(log);

        console.log(`Register College ${collegeId} signature:`, tx);
      } catch (error) {
        console.log(error);
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
            systemProgram: SystemProgram.programId,
          })
          .signers([admin, collegeAuthorities[i]])
          .rpc()
          .then(confirm)
          .then(log);

        console.log(`Renew Subscription College ${collegeId} signature:`, tx);
      } catch (error) {
        console.log(error);
      }
    });

    it(`Add collections to college ${i + 1}`, async () => {
      try {
        const collegeId = i + 1;

        const [collegeAccount] = PublicKey.findProgramAddressSync(
          [Buffer.from("college"), new Uint8Array([collegeId, 0])],
          program.programId
        );

        // Create a new collection for this college
        const newCollection = Keypair.generate();
        collections[i] = newCollection; // Store for later use

        const args = {
          name: "TEST COLLECTION",
          uri: "https://example.com/event",
        };

        const tx = await program.methods
          .addCollection(collegeId, args)
          .accountsStrict({
            collegeAccount: collegeAccount,
            collegeAuthority: collegeAuthorities[i].publicKey,
            mplCoreProgram: MPL_CORE_PROGRAM_ID,
            newCollection: newCollection.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([collegeAuthorities[i], newCollection])
          .rpc()
          .then(confirm)
          .then(log);
        console.log(`Add collections to college ${collegeId} signature:`, tx);
      } catch (error) {
        console.log(error);
      }
    });

    it(`Add assest to college ${i + 1}`, async () => {
      try {
        const collegeId = i + 1;

        const [collegeAccount] = PublicKey.findProgramAddressSync(
          [Buffer.from("college"), new Uint8Array([collegeId, 0])],
          program.programId
        );

        const args = {
          name: "TEST ASSET",
          uri: "https://example.com/event",
          studentName: "RAUNIT JAISWAL",
          courseName: "Turbine",
          completionDate: "15 feb",
          grade: "1st year",
        };

        const asset = Keypair.generate();

        const transaction2 = new anchor.web3.Transaction().add(
          anchor.web3.SystemProgram.transfer({
            fromPubkey: provider.publicKey,
            toPubkey: asset.publicKey,
            lamports: 40000000,
          })
        );

        await provider.sendAndConfirm(transaction2);

        const tx = await program.methods
          .mintCertificate(collegeId, args)
          .accountsStrict({
            collegeAccount: collegeAccount,
            collegeAuthority: collegeAuthorities[i].publicKey,
            mplCoreProgram: MPL_CORE_PROGRAM_ID,
            collection: collections[i].publicKey,
            systemProgram: SystemProgram.programId,
            asset: asset.publicKey,
            studentWallet: studentWallets[i].publicKey,
          })
          .signers([collegeAuthorities[i], asset, studentWallets[i]])
          .rpc()
          .then(confirm)
          .then(log);
        console.log(`Add asset to college ${collegeId} signature:`, tx);
      } catch (error) {
        console.log(error);
      }
    });
  }

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
});
