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
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  createMint,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptMint,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
    MPL_CORE_PROGRAM_ID,
    mplCore,
    fetchCollection
} from "@metaplex-foundation/mpl-core";
import {
  base58,
  createSignerFromKeypair,
  generateSigner,
  signerIdentity,
  sol
} from "@metaplex-foundation/umi";
import { BN, min } from "bn.js";

describe("metaverf", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider();
  const connection = provider.connection;
  const umi = createUmi(provider.connection.rpcEndpoint)
    .use(mplCore());

  const annualFee = new BN(1e6);
  const subscriptionDuration = new BN(1e6);

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

  let admin: Keypair;
  let collegeAuthority: Keypair;
  let adminTokenAccount: PublicKey;
  let treasury: PublicKey;
  let payerTokenAccount: PublicKey;
  let mintUsdc: PublicKey;

  const signer = generateSigner(umi);
  umi.use(signerIdentity(signer));

// Generate a new random KeypairSigner using the Eddsa interface
  const collectionSigner = generateSigner(umi);
  let collection = Keypair.generate();

  const [metaverfAccount, metaverfBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("protocol")],
    program.programId
  );

  const [collegeAccount, collegeBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("college")],
    program.programId
  );
  //new BN(collegeId).toArrayLike(Buffer, "le", 8)],
  

  before(async () => {
    admin = Keypair.generate();
    const transferIx = anchor.web3.SystemProgram.transfer({
      fromPubkey: provider.wallet.publicKey,
      toPubkey: admin.publicKey,
      lamports: 10 * LAMPORTS_PER_SOL,
    });
    const tx = new anchor.web3.Transaction().add(transferIx);
    await provider.sendAndConfirm(tx);

    collegeAuthority = Keypair.generate();
    const transferIx2 = anchor.web3.SystemProgram.transfer({
      fromPubkey: provider.wallet.publicKey,
      toPubkey: collegeAuthority.publicKey,
      lamports: 10 * LAMPORTS_PER_SOL,
    });
    const tx2 = new anchor.web3.Transaction().add(transferIx2);
    await provider.sendAndConfirm(tx2);

    mintUsdc = await createMint(
      provider.connection,
      admin,
      metaverfAccount,
      null,
      0
    );

    adminTokenAccount = getAssociatedTokenAddressSync(
      mintUsdc,
      admin.publicKey,
      false,
      tokenProgram
    );

    treasury = getAssociatedTokenAddressSync(
      mintUsdc,
      metaverfAccount,
      true,
      tokenProgram
    );

    payerTokenAccount = getAssociatedTokenAddressSync(
      mintUsdc,
      collegeAuthority.publicKey,
      false,
      tokenProgram
    );

    // Initialize the collection account
    collection = Keypair.generate();
    const airdropIx = anchor.web3.SystemProgram.transfer({
      fromPubkey: provider.wallet.publicKey,
      toPubkey: collection.publicKey,
      lamports: 1 * LAMPORTS_PER_SOL,
    });
    const airdropTx = new anchor.web3.Transaction().add(airdropIx);
    await provider.sendAndConfirm(airdropTx);
  });

  it("Airdrop and Create Mints", async () => {
    const lamports = await getMinimumBalanceForRentExemptMint(connection);
    const transferTx = new Transaction();
  });

  it("Initialize Protocol", async () => {
    const tx = await program.methods
      .initialize(annualFee, subscriptionDuration)
      .accountsPartial({
        admin: admin.publicKey,
        mintUsdc: mintUsdc,
        metaverfAccount: metaverfAccount,
        treasury: treasury,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: tokenProgram,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin])
      .rpc()
      .then(confirm)
      .then(log);

    console.log("Protocol initialization signature:", tx);
  });

  it("Register College", async () => {
    const metaverfInfo = await program.account.metaverfAccount.fetch(
      metaverfAccount
    );
    const collegeId = metaverfInfo.uniNo;

    const [collegeAccount, collegeBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("college"), new BN(collegeId).toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    const tx = await program.methods
      .registerCollege()
      .accountsPartial({
        admin: admin.publicKey,
        mintUsdc: mintUsdc,
        collegeAccount: collegeAccount,
        collection: collection.publicKey,
        collegeAuthority: collegeAuthority.publicKey,
        metaverfAccount: metaverfAccount,
        treasury: treasury,
        payerTokenAccount: payerTokenAccount,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: tokenProgram,
        mplCoreProgram: MPL_CORE_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin, collegeAuthority, collection])
      .rpc()
      .then(confirm)
      .then(log);

    console.log("Register College signature:", tx);
  });

  it("Renew Subscription", async () => {
    const metaverfInfo = await program.account.metaverfAccount.fetch(
      metaverfAccount
    );
    const collegeId = metaverfInfo.uniNo - 1; // Get the last registered college

    const [collegeAccount, collegeBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("college"), new BN(collegeId).toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    const tx = await program.methods
      .renewSubscription()
      .accountsPartial({
        admin: admin.publicKey,
        mintUsdc: mintUsdc,
        collegeAccount: collegeAccount,
        collegeAuthority: collegeAuthority.publicKey,
        metaverfAccount: metaverfAccount,
        treasury: treasury,
        payerTokenAccount: payerTokenAccount,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: tokenProgram,
        systemProgram: SystemProgram.programId,
      })
      .signers([collegeAuthority])
      .rpc()
      .then(confirm)
      .then(log);

    console.log("Renew Subscription signature:", tx);
  });

  it("Update Parameters", async () => {
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
  });

  it("Withdraw Fees", async () => {
    const amount = new BN(0);
    try {
      const tx = await program.methods
        .withdrawFees(amount)
        .accountsPartial({
          admin: admin.publicKey,
          mintUsdc: mintUsdc,
          metaverfAccount: metaverfAccount,
          treasury: treasury,
          adminTokenAccount,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenProgram: tokenProgram,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();
      console.log("Withdraw success:", tx);
    } catch (err) {
      console.error("Withdraw failed:", err.logs || err);
    }
  });

  // Uncomment the following tests if needed
  // it("Register College", async () => {
  //   const metaverfInfo = await program.account.metaverfAccount.fetch(
  //     metaverfAccount
  //   );
  //   const collegeId = metaverfInfo.uniNo + 1;

  //   const [collegeAccount, collegeBump] = PublicKey.findProgramAddressSync(
  //     [Buffer.from("college"), collegeId.toArrayLike(Buffer, "le", 8)],
  //     program.programId
  //   );

  //   const tx = await program.methods
  //     .registerCollege()
  //     .accountsPartial({
  //       admin: admin.publicKey,
  //       mintUsdc: mintUsdc.publicKey,
  //       metaverfAccount: metaverfAccount,
  //       treasury: treasury,
  //       associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
  //       tokenProgram: tokenProgram,
  //       systemProgram: SystemProgram.programId,
  //     })
  //     .signers([admin])
  //     .rpc()
  //     .then(confirm)
  //     .then(log);

  //   console.log("Register college signature:", tx);
  // });

  // it("Renew Subscription", async () => {
  //   const metaverfInfo = await program.account.metaverfAccount.fetch(
  //     metaverfAccount
  //   );
  //   const collegeId = metaverfInfo.uniNo + 1;

  //   const [collegeAccount, collegeBump] = PublicKey.findProgramAddressSync(
  //     [Buffer.from("college"), collegeId.toArrayLike(Buffer, "le", 8)],
  //     program.programId
  //   );

  //   const tx = await program.methods
  //     .renewSubscription()
  //     .accountsPartial({
  //       admin: admin.publicKey,
  //       mintUsdc: mintUsdc.publicKey,
  //       collegeAuthority: collegeAuthority.publicKey,
  //       metaverfAccount: metaverfAccount,
  //       treasury: treasury,
  //       collegeAccount,
  //       associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
  //       tokenProgram: tokenProgram,
  //       systemProgram: SystemProgram.programId,
  //     })
  //     .signers([admin])
  //     .rpc()
  //     .then(confirm)
  //     .then(log);

  //   console.log("Renew subscription signature:", tx);
  // });
});
