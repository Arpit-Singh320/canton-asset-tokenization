import { CreateCommand, ExerciseCommand } from '@c7/ledger';

// =================================================================================================
// Constants & Configuration
// =================================================================================================

const LEDGER_URL = 'http://localhost:7575'; // Default for dpm sandbox

// Template IDs - assuming a Daml module structure like `Rwa.Asset`, `Rwa.Instrument`, etc.
const TEMPLATE_IDS = {
  Instrument: "Rwa.Instrument:Instrument",
  Asset: "Rwa.Asset:Asset",
  TransferProposal: "Rwa.Asset:TransferProposal",
  Whitelist: "Rwa.Whitelist:Whitelist",
  DistributionProposal: "Rwa.Distribution:DistributionProposal",
  Dividend: "Rwa.Distribution:Dividend",
};

// =================================================================================================
// Type Definitions
// =================================================================================================

/**
 * Represents the connection context for interacting with the Canton ledger.
 */
export interface LedgerContext {
  token: string;
  party: string;
}

/**
 * Represents an active contract on the ledger, as returned by the JSON API.
 */
export interface ActiveContract<T> {
  contractId: string;
  templateId: string;
  payload: T;
}

// Daml Type Aliases for clarity
type Party = string;
type ContractId<T> = string;
type Decimal = string; // Daml Decimals are represented as strings in JSON API
type Date = string;    // Daml Dates (YYYY-MM-DD) are strings in JSON API

// Payload types for key templates
export interface Instrument {
  issuer: Party;
  id: string;
  description: string;
  assetType: string;
  quantity: Decimal;
  whitelist: ContractId<Whitelist>;
  observers: Party[];
}

export interface Asset {
  instrument: Instrument;
  owner: Party;
  quantity: Decimal;
}

export interface TransferProposal {
  asset: Asset;
  newOwner: Party;
}

export interface Whitelist {
  issuer: Party;
  instrumentId: string;
  allowedParties: Party[];
}

export interface DistributionProposal {
    issuer: Party;
    instrument: Instrument;
    exDate: Date;
    payDate: Date;
    amountPerShare: Decimal;
}

export interface Dividend {
    owner: Party;
    instrument: Instrument;
    payDate: Date;
    amount: Decimal;
}


// =================================================================================================
// Private Helper Functions
// =================================================================================================

/**
 * Executes a generic, authenticated POST request to the JSON API.
 * @param endpoint The API endpoint (e.g., '/v1/query').
 * @param token The JWT for authorization.
 * @param body The request body.
 * @returns The JSON response from the API.
 */
async function post<T>(endpoint: string, token: string, body: object): Promise<T> {
  const url = `${LEDGER_URL}${endpoint}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`API request failed [${response.status} ${response.statusText}] to ${url}:`, errorBody);
    throw new Error(`Request failed: ${response.statusText}`);
  }

  const json = await response.json();
  if (json.status !== 200) {
    console.error(`API returned non-200 status in body:`, json);
    throw new Error(`API Error: ${JSON.stringify(json.errors)}`);
  }

  return json.result as T;
}

/**
 * Queries the ledger for active contracts based on a template ID.
 * @param context The ledger context.
 * @param templateId The full template ID to query for.
 * @returns A promise that resolves to an array of active contracts.
 */
async function query<T>(context: LedgerContext, templateId: string): Promise<ActiveContract<T>[]> {
  return post<ActiveContract<T>[]>('/v1/query', context.token, { templateIds: [templateId] });
}

/**
 * Submits a command to create a new contract.
 * @param context The ledger context.
 * @param command The create command payload.
 * @returns The result of the create command.
 */
async function create(context: LedgerContext, command: CreateCommand) {
  return post('/v1/create', context.token, command);
}

/**
 * Submits a command to exercise a choice on an existing contract.
 * @param context The ledger context.
 * @param command The exercise command payload.
 * @returns The result of the exercise command, typically including the created contract.
 */
async function exercise(context: LedgerContext, command: ExerciseCommand) {
  return post('/v1/exercise', context.token, command);
}

// =================================================================================================
// Public Service API
// =================================================================================================

/**
 * Fetches all token instruments visible to the current party.
 */
export const getInstruments = (context: LedgerContext): Promise<ActiveContract<Instrument>[]> =>
  query<Instrument>(context, TEMPLATE_IDS.Instrument);

/**
 * Fetches all asset holdings for the current party.
 */
export const getHoldings = (context: LedgerContext): Promise<ActiveContract<Asset>[]> =>
  query<Asset>(context, TEMPLATE_IDS.Asset);

/**
 * Fetches all pending inbound transfer proposals for the current party.
 */
export const getInboundTransferProposals = (context: LedgerContext): Promise<ActiveContract<TransferProposal>[]> =>
  query<TransferProposal>(context, TEMPLATE_IDS.TransferProposal);


/**
 * Fetches all dividends payable to the current party.
 */
export const getDividends = (context: LedgerContext): Promise<ActiveContract<Dividend>[]> =>
    query<Dividend>(context, TEMPLATE_IDS.Dividend);


/**
 * Proposes to transfer a quantity of an asset to a new owner.
 * @param context The ledger context.
 * @param assetCid The ContractId of the Asset holding to transfer from.
 * @param newOwner The Party to transfer the asset to.
 * @param quantity The amount of the asset to transfer.
 */
export const proposeTransfer = (
  context: LedgerContext,
  assetCid: ContractId<Asset>,
  newOwner: Party,
  quantity: Decimal
) => {
  const exerciseCommand: ExerciseCommand = {
    templateId: TEMPLATE_IDS.Asset,
    contractId: assetCid,
    choice: 'Propose_Transfer',
    argument: {
      newOwner,
      quantity,
    },
  };
  return exercise(context, exerciseCommand);
};

/**
 * Accepts a pending asset transfer proposal.
 * @param context The ledger context.
 * @param proposalCid The ContractId of the TransferProposal to accept.
 */
export const acceptTransfer = (context: LedgerContext, proposalCid: ContractId<TransferProposal>) => {
  const exerciseCommand: ExerciseCommand = {
    templateId: TEMPLATE_IDS.TransferProposal,
    contractId: proposalCid,
    choice: 'Accept_Transfer',
    argument: {},
  };
  return exercise(context, exerciseCommand);
};

/**
 * Claims a pending dividend payment.
 * @param context The ledger context.
 * @param dividendCid The ContractId of the Dividend to claim.
 */
export const claimDividend = (context: LedgerContext, dividendCid: ContractId<Dividend>) => {
    const exerciseCommand: ExerciseCommand = {
      templateId: TEMPLATE_IDS.Dividend,
      contractId: dividendCid,
      choice: 'Claim',
      argument: {},
    };
    return exercise(context, exerciseCommand);
};


// =================================================================================================
// Issuer / Admin specific functions
// =================================================================================================


/**
 * Issues a new asset to a specified owner. (Issuer only)
 * @param context The ledger context (must be the issuer).
 * @param instrumentCid The ContractId of the Instrument to issue against.
 * @param owner The party who will own the new asset.
 * @param quantity The quantity of the asset to issue.
 */
export const issueAsset = (
    context: LedgerContext,
    instrumentCid: ContractId<Instrument>,
    owner: Party,
    quantity: Decimal
) => {
    const exerciseCommand: ExerciseCommand = {
        templateId: TEMPLATE_IDS.Instrument,
        contractId: instrumentCid,
        choice: 'Issue',
        argument: {
            owner,
            quantity
        }
    };
    return exercise(context, exerciseCommand);
};

/**
 * Adds a party to an instrument's whitelist. (Issuer only)
 * @param context The ledger context (must be the issuer).
 * @param whitelistCid The ContractId of the Whitelist contract.
 * @param partyToAdd The party to add to the allowed list.
 */
export const addToWhitelist = (
    context: LedgerContext,
    whitelistCid: ContractId<Whitelist>,
    partyToAdd: Party
) => {
    const exerciseCommand: ExerciseCommand = {
        templateId: TEMPLATE_IDS.Whitelist,
        contractId: whitelistCid,
        choice: 'AddParty',
        argument: {
            partyToAdd
        }
    };
    return exercise(context, exerciseCommand);
}

/**
 * Proposes a new dividend distribution for an instrument. (Issuer only)
 * @param context The ledger context (must be the issuer).
 * @param instrumentCid The ContractId of the Instrument to distribute dividends for.
 * @param exDate The ex-dividend date.
 * @param payDate The payment date.
 * @param amountPerShare The cash amount to be paid per share/unit.
 */
export const proposeDistribution = (
    context: LedgerContext,
    instrumentCid: ContractId<Instrument>,
    exDate: Date,
    payDate: Date,
    amountPerShare: Decimal
) => {
    const exerciseCommand: ExerciseCommand = {
        templateId: TEMPLATE_IDS.Instrument,
        contractId: instrumentCid,
        choice: 'Propose_Distribution',
        argument: {
            exDate,
            payDate,
            amountPerShare
        }
    };
    return exercise(context, exerciseCommand);
}