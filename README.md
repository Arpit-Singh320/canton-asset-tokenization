# Canton Asset Tokenization Platform

This project provides a comprehensive Daml-based solution for the tokenization of Real-World Assets (RWAs) on the Canton Network. It models the entire lifecycle of a tokenized asset, from issuance and distribution to secondary trading and corporate actions, with a strong focus on regulatory compliance and operational efficiency.

The platform is designed to handle various asset classes, including:
*   **Private Equity:** Tokenized shares in non-public companies.
*   **Real Estate:** Fractional ownership of commercial or residential properties.
*   **Investment Funds:** Digital units representing a stake in a managed fund.
*   **Private Credit:** Tokenized representations of loan agreements.

By leveraging Daml smart contracts and the Canton Network's privacy and interoperability features, this platform aims to unlock liquidity for traditionally illiquid assets, streamline complex workflows, and provide a transparent, auditable source of truth for all stakeholders.

## Core Features

*   **Asset Tokenization & Fractionalization:** Create digital tokens that represent legal ownership of a real-world asset, allowing for fractional ownership and broader investor access.
*   **Lifecycle Management:** Complete on-ledger management of the asset's lifecycle, including issuance, transfers, redemption, and burning.
*   **Compliance by Design:** Enforce regulatory requirements, such as KYC/AML and investor accreditation, through an on-chain whitelist mechanism. Transfers are restricted to authorized parties only.
*   **Automated Dividend & Distribution:** Streamline the distribution of income (e.g., dividends, rental yield) to token holders. The platform automates the calculation and creation of payout claims for each holder based on their stake.
*   **Corporate Actions:** Model and execute corporate actions like stock splits, capital calls, and shareholder voting with full transparency and auditability.
*   **Atomic DvP Settlement:** Ensure risk-free settlement for secondary trades through Daml's atomic transaction guarantees (Delivery versus Payment).
*   **Role-Based Access Control:** A clear and secure permissioning model defining the capabilities of each participant (Operator, Issuer, Investor).
*   **Privacy and Scalability:** Built for the Canton Network, ensuring that transaction details are kept private between the involved parties while enabling interoperability across different domains.

## Business Workflow & Roles

The platform defines several key roles to manage the tokenization process securely:

*   **Operator:** The platform administrator or a regulated entity (e.g., a transfer agent, fund administrator). The Operator onboards all other participants and has oversight over the platform's core functions.
*   **Issuer:** The owner of the real-world asset who wishes to tokenize it. The Issuer is responsible for defining the asset's terms and initiating distributions.
*   **Investor:** An accredited individual or institution that has been whitelisted by the Operator to invest in and trade tokenized assets.

The primary workflow follows these steps:
1.  **Onboarding:** The `Operator` onboards an `Issuer` and several `Investor`s by creating `IssuerRole` and `InvestorRole` contracts on the ledger. These roles grant specific permissions.
2.  **Asset Definition:** The `Issuer` proposes the creation of a new `TokenizedAsset` to the `Operator`. This proposal includes details like asset name, total supply, and any specific rules.
3.  **Tokenization:** Upon `Operator` approval, the `TokenizedAsset` master contract is created. This contract acts as the central authority for the asset, enforcing all rules. The initial total supply is then minted into a single `AssetHolding` contract owned by the `Issuer`.
4.  **Primary Issuance (Distribution):** The `Issuer` can split their initial `AssetHolding` and use `TransferProposal` contracts to offer tokens to whitelisted `Investor`s.
5.  **Secondary Trading:** Whitelisted `Investor`s can trade their `AssetHolding`s with each other. The `TokenizedAsset` contract automatically validates that both parties in a trade are on the whitelist before allowing the transfer to complete.
6.  **Dividend Distribution:** The `Issuer` initiates a dividend by creating a `DividendDistribution` contract, specifying the payout amount per token. The `Operator` approves it, which triggers the automatic creation of `DividendClaim` contracts for every `AssetHolding` owner on the ledger at that moment.
7.  **Payout:** Investors can exercise a choice on their `DividendClaim` contract to receive their payment (the settlement leg would typically involve an off-ledger payment system or a cash token).

## Daml Model Overview

The logic is encapsulated in several key Daml templates:

### `daml/Asset/TokenizedAsset.daml`
*   `TokenizedAsset`: The master template for a specific tokenized asset. It holds the asset's properties (total supply, issuer, operator) and enforces transfer rules (e.g., checking the whitelist).
*   `AssetHolding`: Represents a fungible holding of a specific quantity of the `TokenizedAsset`. This is the contract that investors own and trade.
*   `TransferProposal`: A standard proposal/acceptance pattern contract to facilitate the atomic transfer of an `AssetHolding` from one party to another.

### `daml/Asset/Roles.daml`
*   `OperatorRole`: A singleton contract identifying the platform operator.
*   `IssuerRole`: A contract that designates a party as a valid issuer of assets.
*   `InvestorRole`: A contract that whitelists a party as an eligible investor, allowing them to hold and trade assets.

### `daml/Asset/Distribution.daml`
*   `DividendDistribution`: Manages a dividend event for a `TokenizedAsset`. It contains the logic for initiating the distribution to all current holders.
*   `DividendClaim`: An individual, non-transferable contract representing an investor's right to claim their portion of a declared dividend.

## Getting Started

### Prerequisites
*   Daml SDK v3.1.0 ([Installation Guide](https://docs.daml.com/getting-started/installation.html))
*   Java 11 or higher
*   Git

### Setup and Running the Project

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/digital-asset/canton-asset-tokenization.git
    cd canton-asset-tokenization
    ```

2.  **Build the Daml model:**
    This command compiles the Daml code into a DAR (Daml Archive) file.
    ```bash
    daml build
    ```

3.  **Run the local ledger environment:**
    This command starts a local Canton ledger, the HTTP JSON API, and the Daml Navigator UI.
    ```bash
    daml start
    ```
    *   **JSON API:** Available at `http://localhost:7575`
    *   **Navigator:** A data-management UI available at `http://localhost:7500`

4.  **Run Tests:**
    To execute the automated tests for the smart contracts:
    ```bash
    daml test
    ```

5.  **Run Initialization Script:**
    To populate the ledger with sample participants and assets, run the `setup` script. This makes it easier to explore the workflow in Daml Navigator.
    ```bash
    daml script \
      --dar .daml/dist/canton-asset-tokenization-0.1.0.dar \
      --script-name Main:setup \
      --ledger-host localhost \
      --ledger-port 6865
    ```

    After running the script, you can log into the Navigator (at `http://localhost:7500`) as parties like `Operator`, `RealEstateCo`, `InvestorAlice`, or `InvestorBob` to view their contracts and exercise choices.