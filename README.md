# Metaverf

**Minting Certificates On Chain in a Decentralized Way**

Metaverf is a blockchain-based protocol for issuing, managing, and verifying certificates in a decentralized manner. It is designed for educational institutions and organizations to mint certificates on-chain, ensuring transparency, immutability, and easy verification.

---

## Features

- **On-chain Certificate Minting**: Securely mint certificates on a decentralized blockchain.
- **College Registration**: Colleges and institutions can register and manage their information within the protocol.
- **Subscription Model**: Institutions pay an annual fee to participate and manage certificates.
- **Treasury System**: All protocol payments are managed in a decentralized treasury using a stablecoin (USDC).
- **Collections**: Colleges can create multiple collections (e.g., batches or departments) for categorizing certificates.
- **Secure and Transparent**: Leverages Solana and Anchor for secure, permissioned actions and account management.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/)
- [Yarn](https://yarnpkg.com/) or [npm](https://www.npmjs.com/)
- Rust and Solana CLI tools
- [Anchor framework](https://book.anchor-lang.com/)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/raunit-dev/Metaverf.git
   cd Metaverf
   ```

2. **Install dependencies:**
   ```bash
   yarn install
   # or
   npm install
   ```

3. **Configure Anchor and Solana:**
   - Set up your wallet and Solana environment as per the [Anchor documentation](https://book.anchor-lang.com/chapter_2/setting_up.html).

---

## Usage

### Deploy the Program

1. **Build the program:**
   ```bash
   anchor build
   ```

2. **Deploy to localnet or devnet:**
   ```bash
   anchor deploy
   ```

### Run Tests

The project includes comprehensive tests using Anchor and Typescript.

```bash
anchor test
```

---

## Protocol Overview

### Main Instructions

- **Initialize Protocol:** Set up the protocol with admin, treasury, fee, and subscription duration.
- **Register College:** Allow a college/institution to register (requires paying the annual fee).
- **Renew Subscription:** Colleges can renew their annual subscription.
- **Add Collection:** Colleges can create new certificate collections with metadata.
- **Withdraw Fees:** Admin can withdraw protocol fees from the treasury.
- **Update Parameters:** Admin can update protocol parameters like fees or subscription duration.

### Example: Registering a College

- The admin initializes the protocol.
- The college authority registers, paying the annual fee in USDC.
- The protocol maintains a unique account for each registered college.

---

## Contribution

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/your-feature`).
3. Make your changes and commit them.
4. Push to your fork and submit a pull request.

For major changes, please open an issue first to discuss what you would like to change.

---

## License

This repository does not yet specify an open source license. Please contact the maintainer for more details.

---

## Contact

For questions or support, please open an issue on the [GitHub repository](https://github.com/raunit-dev/Metaverf).
