# Canton Asset Tokenization Platform

This project provides a robust framework for tokenizing Real-World Assets (RWAs) on the Canton Network using Daml smart contracts. It's designed to model complex financial instruments like private equity, real estate funds, and other securities, ensuring regulatory compliance through features like whitelisting and controlled distributions.

The platform demonstrates how Canton's privacy and interoperability features can be leveraged to build sophisticated, production-grade financial applications.

## Key Features

*   **Fractional Ownership**: Represents ownership of an asset via fungible tokens, allowing for multiple investors and easier liquidity.
*   **Whitelist-Based Transfers**: Enforces regulatory compliance (e.g., KYC/AML, accredited investor rules) by restricting token transfers to a pre-approved list of parties.
*   **Dividend & Distribution Lifecycle**: Manages the entire lifecycle of paying dividends or distributions to token holders, from declaration to payment, with full auditability.
*   **Corporate Actions**: A framework for handling corporate actions such as stock splits, mergers, or rights issues.
*   **Atomic Delivery-vs-Payment (DvP)**: Securely settles asset transfers against payment using Canton's composability features.
*   **Auditable & Transparent**: Provides a tamper-proof, auditable history of all transactions and ownership changes for regulators and stakeholders.

## Technology Stack

*   **Smart Contracts**: [Daml](https://www.daml.com)
*   **Ledger**: [Canton Network](https://www.canton.io)
*   **Build Tool**: [DPM (Digital Asset Package Manager)](https://docs.digitalasset.com/dpm/index.html)
*   **Frontend**: TypeScript, React, [@c7/react](https://docs.digitalasset.com/app-dev/bindings-ts/c7-react.html)
*   **UI Components**: Material UI

## Project Structure

```
.
├── daml/                      # Daml smart contract source code
│   ├── Asset.daml             # Core asset tokenization model
│   ├── Distribution.daml      # Dividend/distribution lifecycle model
│   ├── Whitelist.daml         # Investor whitelist management
│   └── test/                  # Daml Script tests
├── frontend/                  # React-based web frontend
│   ├── src/
│   ├── package.json
│   └── ...
├── .gitignore
├── daml.yaml                  # Daml project configuration
└── README.md
```

## Getting Started

Follow these instructions to set up and run the project locally.

### Prerequisites

1.  **DPM (Daml Package Manager)**: Install the Daml SDK version 3.4.0 or higher.
    ```bash
    curl https://get.digitalasset.com/install/install.sh | sh
    ```
2.  **Node.js**: Version 18.x or later.
3.  **Java**: JDK 11 or later.

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/canton-asset-tokenization.git
cd canton-asset-tokenization
```

### 2. Build the Daml Contracts

Compile the Daml code into a DAR (Daml Archive) file.

```bash
dpm build
```
This command reads the `daml.yaml` file, resolves dependencies, and creates the deployable artifact at `.daml/dist/canton-asset-tokenization-0.1.0.dar`.

### 3. Run the Canton Sandbox

Start a local Canton ledger instance. This also exposes the JSON API on port `7575`.

```bash
dpm sandbox
```
The sandbox will remain running. Keep this terminal open.

### 4. Run Daml Tests

In a **new terminal window**, execute the Daml Script tests to verify the contract logic.

```bash
dpm test
```

### 5. Set Up and Run the Frontend

Navigate to the `frontend` directory, install dependencies, and start the development server.

```bash
cd frontend
npm install
npm start
```
The application will be available at `http://localhost:3000`.

## Daml Model Overview

The core logic of the platform resides in the Daml smart contracts.

*   **`Asset.daml`**: Defines the `Asset` template, which represents the tokenized real-world asset. It includes details like the issuer, total supply, and associated whitelist authority. It also defines the `Token` template, representing a holding of the asset by a specific owner.

*   **`Whitelist.daml`**: Implements the `Whitelist` contract and associated logic. An `Asset` is tied to a specific `Whitelist`, and only parties on that list are authorized to hold or receive its tokens. This is the primary mechanism for enforcing regulatory compliance.

*   **`Distribution.daml`**: Manages cash distributions to token holders. It includes a multi-step process:
    1.  **Declaration**: The issuer declares a distribution with a specific record date and payment amount per token.
    2.  **Calculation**: A snapshot of token holders is taken on the record date to calculate entitlements.
    3.  **Payment**: The issuer initiates payments, which are settled atomically with each holder.

## License

This project is licensed under the [MIT License](LICENSE).