import React, { FC, ReactNode, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { SOLANA_CLUSTER, SOLANA_CONNECTION } from '@/integrations/solana/config';

// Default styles that can be overridden by your app
import '@solana/wallet-adapter-react-ui/styles.css';

interface SolanaWalletContextProviderProps {
  children: ReactNode;
}

export const SolanaWalletContextProvider: FC<SolanaWalletContextProviderProps> = ({ children }) => {
  const network = SOLANA_CLUSTER as WalletAdapterNetwork;

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      // Add other wallets here if desired
    ],
    [network]
  );

  return (
    <ConnectionProvider endpoint={SOLANA_CONNECTION.rpcEndpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};