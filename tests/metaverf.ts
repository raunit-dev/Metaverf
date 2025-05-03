import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Metaverf } from "../target/types/metaverf";
import { TOKEN_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";
import { publicKey } from "@coral-xyz/anchor/dist/cjs/utils";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PUBLIC_KEY_LENGTH,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  MINT_SIZE,
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccount,
  createAssociatedTokenAccountIdempotentInstruction,
  createInitializeMint2Instruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptAccount,
  getMinimumBalanceForRentExemptMint,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { BN } from "bn.js";
// import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
// import {
//     MPL_CORE_PROGRAM_ID,
//     mplCore,
//     fetchCollection
// } from "@metaplex-foundation/mpl-core";
// import {
//     base58,
//     createSignerFromKeypair,
//     generateSigner,
//     signerIdentity,
//     sol
// } from "@metaplex-foundation/umi";

describe("metaverf", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider();
  const connection = provider.connection;
  const annualFee = new BN(1e6);
  const subscriptionDuration = new BN(1e6);

  const program = anchor.workspace.Metaverf as Program<Metaverf>;
  const programId = program.programId;
  const tokenProgram = TOKEN_2022_PROGRAM_ID;

  const confirm = async (signature: string): Promise<string> => {
    const block = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature,
      ...block
    });
    return signature;
  }

  const log = async (signature: string): Promise<string> => {
    console.log(
      `Your transaction signature: https://explorer.solana.com/transaction/${signature}?cluster=custom&customUrl=${connection.rpcEndpoint}`
    );
    return signature;
  }

  // Generate keypairs for admin and mint
  const admin = Keypair.generate();
  const mintUsdc = Keypair.generate();
  const collegeAuthority = Keypair.generate();

  // Derive the metaverf account PDA
  const [metaverfAccount, metaverfBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("protocol")],
    program.programId
  );



  // Create token accounts - Admin's personal token account
  const adminTokenAccount = getAssociatedTokenAddressSync(
    mintUsdc.publicKey,
    admin.publicKey,
    false,
    tokenProgram
  );

  // The treasury token account with metaverfAccount as the authority
  const treasury = getAssociatedTokenAddressSync(
    mintUsdc.publicKey,
    metaverfAccount,
    true, // allowOwnerOffCurve = true because PDA is not on the ed25519 curve
    tokenProgram
  );

  const payer_token_account = //todo do i need to change payer_token_account in register_College ?  like say the authority and mint for these ata i guess is should?

  it("Airdrop and Create Mints", async () => {
    // Request airdrop for admin
    const signature = await connection.requestAirdrop(
      admin.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    await confirm(signature);

    // Create and initialize mint - must be in a separate transaction
    const lamports = await getMinimumBalanceForRentExemptMint(connection);
    const transferTx = new Transaction();
    transferTx.add(
      SystemProgram.transfer({
        fromPubkey: provider.publicKey,
        toPubkey: admin.publicKey,
        lamports: 10 * LAMPORTS_PER_SOL,
      }),
      SystemProgram.transfer({
        fromPubkey: provider.publicKey,
        toPubkey: mintUsdc.publicKey,
        lamports: 10 * LAMPORTS_PER_SOL,
      }),
      SystemProgram.transfer({
        fromPubkey: provider.publicKey,
        toPubkey: collegeAuthority.publicKey,
        lamports: 10 * LAMPORTS_PER_SOL,
      })
    )

    await provider.sendAndConfirm(transferTx)
     .then(sig => log(`Transfer done: ${sig}`));
    const mintTx = new Transaction();
    mintTx.add(
      SystemProgram.createAccount({
        fromPubkey: admin.publicKey, // Admin pays for creation
        newAccountPubkey: mintUsdc.publicKey,
        lamports,
        space: MINT_SIZE,
        programId: tokenProgram
      }),
      createInitializeMint2Instruction(
        mintUsdc.publicKey,
        6,
        admin.publicKey, // Set admin as mint authority initially
        null,
        tokenProgram
      )
    );

    // Sign and send mint creation tx
    await provider.sendAndConfirm(mintTx, [admin, mintUsdc])
      .then(sig => log(`Mint creation signature: ${sig}`));

    // Create admin's token account and mint tokens - separate transaction
    const ataTx = new Transaction();
    ataTx.add(
      createAssociatedTokenAccountIdempotentInstruction(
        admin.publicKey, // Payer
        adminTokenAccount,
        admin.publicKey,
        mintUsdc.publicKey,
        tokenProgram
      ),
      createMintToInstruction(
        mintUsdc.publicKey, // Mint
        adminTokenAccount, // Destination token account
        admin.publicKey, // Mint authority
        1e9, // Amount
        undefined,
        tokenProgram
      )
    );

    // Sign and send token account creation tx
    await provider.sendAndConfirm(ataTx, [admin])
      .then(sig => log(`Token account creation signature: ${sig}`));
  });

  it("Initialize Protocol", async () => {
    const tx = await program.methods
      .initialize(annualFee, subscriptionDuration)
      .accountsPartial({
        admin: admin.publicKey,
        mintUsdc: mintUsdc.publicKey,
        metaverfAccount: metaverfAccount,
        treasury: treasury,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        tokenProgram: tokenProgram,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin])
      .rpc()
      .then(confirm)
      .then(log);

    console.log("Protocol initialization signature:", tx);
    
    
  });

  it("register College", async () => {
    const metaverfInfo = await program.account.metaverfAccount.fetch(metaverfAccount);
    const collegeId = metaverfInfo.uniNo + 1;

    const [collegeAccount, collegeBump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("college"),
        collegeId.toArrayLike(Buffer, 'le', 8)
      ],
     program.programId
    )

    const tx = await program.methods
    .registerCollege()
    .accountsPartial({
        admin: admin.publicKey,
        mintUsdc: mintUsdc.publicKey,
        metaverfAccount: metaverfAccount,
        treasury: treasury,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        tokenProgram: tokenProgram,
        systemProgram: SystemProgram.programId,
    })
    .signers([admin])
      .rpc()
      .then(confirm)
      .then(log);

    console.log("Protocol initialization signature:", tx);
  })
});