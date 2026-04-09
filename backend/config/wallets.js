// Powabitz Wallet Addresses Configuration
export const WALLETS = {
  BNB_SMARTCHAIN: {
    network: 'BNB Smart Chain',
    symbol: 'BNB',
    address: '0xab9786e43abb8351b3dbfc31588264facf902bca',
    chainId: 56,
  },
  ETHEREUM: {
    network: 'Ethereum',
    symbol: 'ETH',
    address: '0xab9786e43abb8351b3dbfc31588264facf902bca',
    chainId: 1,
  },
};

export const getWalletAddresses = () => {
  return Object.values(WALLETS);
};

export const getWalletByNetwork = (network) => {
  return Object.values(WALLETS).find(w => w.network === network);
};

export const getWalletByChainId = (chainId) => {
  return Object.values(WALLETS).find(w => w.chainId === chainId);
};
