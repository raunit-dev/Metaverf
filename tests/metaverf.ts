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
import {
  MPL_CORE_PROGRAM_ID,
  mplCore,
  fetchCollection,
} from "@metaplex-foundation/mpl-core";

describe("metaverf", () => {
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

  const admin = Keypair.generate();
  const mintUsdc = Keypair.generate();
  const collegeAuthority = Keypair.generate();

  const [metaverfAccount, metaverfBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("protocol")],
    program.programId
  );

  const adminTokenAccount = getAssociatedTokenAddressSync(
    mintUsdc.publicKey,
    admin.publicKey,
    false,
    tokenProgram
  );

  const treasury = getAssociatedTokenAddressSync(
    mintUsdc.publicKey,
    metaverfAccount,
    true,
    tokenProgram
  );

  it("Airdrop and Create Mints", async () => {
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
        toPubkey: collegeAuthority.publicKey,
        lamports: 10 * LAMPORTS_PER_SOL,
      })
    );

    await provider
      .sendAndConfirm(transferTx)
      // .then((sig) => log(`Transfer done: ${sig}`));

    const mintTx = new Transaction();
    mintTx.add(
      SystemProgram.createAccount({
        fromPubkey: admin.publicKey,
        newAccountPubkey: mintUsdc.publicKey,
        lamports,
        space: MINT_SIZE,
        programId: tokenProgram,
      }),
      createInitializeMint2Instruction(
        mintUsdc.publicKey,
        6,
        admin.publicKey,
        null,
        tokenProgram
      )
    );

    await provider
      .sendAndConfirm(mintTx, [admin, mintUsdc])
      // .then((sig) => log(`Mint creation signature: ${sig}`));

    const ataTx = new Transaction();
    ataTx.add(
      createAssociatedTokenAccountIdempotentInstruction(
        admin.publicKey,
        adminTokenAccount,
        admin.publicKey,
        mintUsdc.publicKey,
        tokenProgram
      ),
      createMintToInstruction(
        mintUsdc.publicKey,
        adminTokenAccount,
        admin.publicKey,
        1e9,
        undefined,
        tokenProgram
      )
    );

    // Uncomment the following lines if needed
    await provider
      .sendAndConfirm(ataTx, [admin])
      // .then((sig) => log(`Token account creation signature: ${sig}`));
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
              mintUsdc: mintUsdc.publicKey,
              metaverfAccount: metaverfAccount,
              treasury: treasury,
              adminTokenAccount,
              associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
              tokenProgram: tokenProgram,
              systemProgram: SystemProgram.programId,})
        .signers([admin])
        .rpc();
      console.log("Withdraw success:", tx);
    } catch (err) {
      console.error("Withdraw failed:", err.logs || err);
    }
    // const tx = await program.methods
    //   .withdrawFees(amount)
    //   .accountsPartial({
    //     admin: admin.publicKey,
    //     mintUsdc: mintUsdc.publicKey,
    //     metaverfAccount: metaverfAccount,
    //     treasury: treasury,
    //     adminTokenAccount,
    //     associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
    //     tokenProgram: tokenProgram,
    //     systemProgram: SystemProgram.programId,
    //   })
    //   .signers([admin])
    //   .rpc()
    //   .then(confirm)
    //   .then(log);

    // console.log("Withdraw fees signature:", tx);
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
