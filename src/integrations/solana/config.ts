import { clusterApiUrl, Connection } from '@solana/web3.js';

// You can change this to 'mainnet-beta', 'testnet', or 'devnet'
export const SOLANA_CLUSTER = 'devnet'; 
export const SOLANA_CONNECTION = new Connection(clusterApiUrl(SOLANA_CLUSTER), 'confirmed');