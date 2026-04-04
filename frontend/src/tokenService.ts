// Copyright (c) 2024 Digital Asset (Canton) Daemon LLC and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { CreateCommand, ExerciseCommand } from '@daml/ledger';

// --- Configuration ---
const LEDGER_URL = process.env.REACT_APP_LEDGER_URL || 'http://localhost:7575';
let authToken: string | null = null;

// --- Type Definitions ---
// These types should mirror the Daml templates they represent.

/** Represents a generic active contract from the JSON API. */
export interface Contract<T> {
  contractId: string;
  templateId: string;
  payload: T;
}

/** Payload for the Token:AssetToken template. */
export interface AssetToken {
  issuer: string;
  owner: string;
  assetId: string;
  description: string;
  quantity: string; // Daml Decimal is a string in JSON
  observers: string[];
}

/** Payload for the Token:TokenIssuanceProposal template. */
export interface TokenIssuanceProposal {
  issuer: string;
  newOwner: string;
  assetId: string;
  description: string;
  quantity: string;
}

/** Payload for the Token:TransferProposal template. */
export interface TransferProposal {
  tokenCid: string; // Daml ContractId is a string in JSON
  currentOwner: string;
  newOwner:string;
  quantity: string;
}

// --- Template Name Helpers ---
// Using a central object for template names avoids typos and makes refactoring easier.
const T = {
    AssetToken: `Token:AssetToken`,
    TokenIssuanceProposal: `Token:TokenIssuanceProposal`,
    TransferProposal: `Token:TransferProposal`,
};

// --- Service Setup ---

/**
 * Sets the authorization token for all subsequent ledger API calls.
 * This should be called once after the user logs in.
 * @param {string} token - The JWT token provided by the authentication service.
 */
export const setToken = (token: string): void => {
  authToken = token;
};

/**
 * A helper function to make authenticated requests to the Canton JSON API.
 * @param {string} endpoint - The API endpoint (e.g., '/v1/query').
 * @param {object} body - The request body.
 * @returns {Promise<any>} The JSON response from the API.
 */
const apiFetch = async (endpoint: string, body: object): Promise<any> => {
  if (!authToken) {
    throw new Error('Authentication token not set. Please call setToken() first.');
  }

  const response = await fetch(`${LEDGER_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('API Request Failed:', errorText);
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();

  if (result.status !== 200) {
    console.error('Ledger Operation Failed:', result.errors);
    throw new Error(`Ledger operation failed: ${JSON.stringify(result.errors)}`);
  }

  return result.result;
};

// --- Ledger Interaction Functions ---

/**
 * Fetches all AssetToken contracts for the currently authenticated party.
 * @param {string} party - The party identifier of the token owner.
 * @returns {Promise<Contract<AssetToken>[]>} A list of active AssetToken contracts.
 */
export const queryTokens = async (party: string): Promise<Contract<AssetToken>[]> => {
  return apiFetch('/v1/query', {
    templateIds: [T.AssetToken],
    query: { owner: party },
  });
};

/**
 * Fetches pending token issuance proposals for the currently authenticated party.
 * @param {string} party - The party identifier of the prospective new owner.
 * @returns {Promise<Contract<TokenIssuanceProposal>[]>} A list of active proposals.
 */
export const queryIssuanceProposals = async (party: string): Promise<Contract<TokenIssuanceProposal>[]> => {
  return apiFetch('/v1/query', {
    templateIds: [T.TokenIssuanceProposal],
    query: { newOwner: party },
  });
};

/**
 * Fetches pending token transfer proposals for the currently authenticated party.
 * @param {string} party - The party identifier of the prospective new owner.
 * @returns {Promise<Contract<TransferProposal>[]>} A list of active proposals.
 */
export const queryTransferProposals = async (party: string): Promise<Contract<TransferProposal>[]> => {
  return apiFetch('/v1/query', {
    templateIds: [T.TransferProposal],
    query: { newOwner: party },
  });
};

/**
 * Creates a proposal to issue a new asset token.
 * @param {object} proposal - The details of the token to be issued.
 * @returns {Promise<any>} The result of the create command.
 */
export const proposeIssuance = async (proposal: Omit<TokenIssuanceProposal, "issuer">): Promise<any> => {
  const command: CreateCommand<TokenIssuanceProposal> = {
    templateId: T.TokenIssuanceProposal,
    payload: {
      ...proposal,
      // Issuer is implicitly the party making the request, but we need to specify it in the payload.
      // In a real app, you'd get this from the user's session/token.
      issuer: proposal.newOwner, // This is a simplification; typically issuer is a separate entity.
    }
  };
  return apiFetch('/v1/create', command);
};

/**
 * Accepts a token issuance proposal.
 * @param {string} proposalCid - The contract ID of the TokenIssuanceProposal.
 * @returns {Promise<any>} The result of exercising the 'Accept' choice.
 */
export const acceptIssuance = async (proposalCid: string): Promise<any> => {
  const command: ExerciseCommand = {
    templateId: T.TokenIssuanceProposal,
    contractId: proposalCid,
    choice: 'Accept',
    argument: {},
  };
  return apiFetch('/v1/exercise', command);
};

/**
 * Proposes to transfer a quantity of an asset token to a new owner.
 * @param {string} tokenCid - The contract ID of the AssetToken to transfer from.
 * @param {string} newOwner - The party to receive the tokens.
 * @param {string} quantity - The quantity of tokens to transfer.
 * @returns {Promise<any>} The result of exercising the 'Propose_Transfer' choice.
 */
export const proposeTransfer = async (tokenCid: string, newOwner: string, quantity: string): Promise<any> => {
  const command: ExerciseCommand = {
    templateId: T.AssetToken,
    contractId: tokenCid,
    choice: 'Propose_Transfer',
    argument: { newOwner, quantity },
  };
  return apiFetch('/v1/exercise', command);
};

/**
 * Accepts a token transfer proposal.
 * @param {string} proposalCid - The contract ID of the TransferProposal.
 * @returns {Promise<any>} The result of exercising the 'Accept' choice.
 */
export const acceptTransfer = async (proposalCid: string): Promise<any> => {
  const command: ExerciseCommand = {
    templateId: T.TransferProposal,
    contractId: proposalCid,
    choice: 'Accept',
    argument: {},
  };
  return apiFetch('/v1/exercise', command);
};

/**
 * Rejects a token transfer proposal.
 * @param {string} proposalCid - The contract ID of the TransferProposal.
 * @returns {Promise<any>} The result of exercising the 'Reject' choice.
 */
export const rejectTransfer = async (proposalCid: string): Promise<any> => {
    const command: ExerciseCommand = {
        templateId: T.TransferProposal,
        contractId: proposalCid,
        choice: 'Reject',
        argument: {}
    };
    return apiFetch('/v1/exercise', command);
};

/**
 * Redeem (burn) a quantity of an asset token.
 * @param {string} tokenCid - The contract ID of the AssetToken to redeem.
 * @param {string} quantity - The quantity to redeem.
 * @returns {Promise<any>} The result of exercising the 'Redeem' choice.
 */
export const redeemToken = async (tokenCid: string, quantity: string): Promise<any> => {
    const command: ExerciseCommand = {
        templateId: T.AssetToken,
        contractId: tokenCid,
        choice: 'Redeem',
        argument: { quantity },
    };
    return apiFetch('/v1/exercise', command);
};