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
} from "@solana/spl-token";
import { BN } from "bn.js";

describe("metaverf", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider();
  const connection = provider.connection;
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
  let adminTokenAccount: PublicKey;
  let treasury: PublicKey;
  let mintUsdc: PublicKey;

  const [metaverfAccount, metaverfBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("protocol")],
    program.programId
  );

  before(async () => {
    admin = Keypair.generate();
    const transferIx = anchor.web3.SystemProgram.transfer({
      fromPubkey: provider.wallet.publicKey,
      toPubkey: admin.publicKey,
      lamports: 10 * LAMPORTS_PER_SOL,
    });
    const tx = new anchor.web3.Transaction().add(transferIx);
    await provider.sendAndConfirm(tx);

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
