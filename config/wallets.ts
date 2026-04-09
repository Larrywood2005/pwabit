export const WALLETS = {
  BNB_SMARTCHAIN: '0xab9786e43abb8351b3dbfc31588264facf902bca',
  ETHEREUM: '0xab9786e43abb8351b3dbfc31588264facf902bca',
} as const;

export const WALLET_NETWORKS = [
  {
    name: 'BNB Smart Chain',
    symbol: 'BNB',
    address: WALLETS.BNB_SMARTCHAIN,
    color: 'from-yellow-500 to-orange-500',
    chainId: 56,
  },
  {
    name: 'Ethereum',
    symbol: 'ETH',
    address: WALLETS.ETHEREUM,
    color: 'from-purple-500 to-indigo-500',
    chainId: 1,
  },
] as const;
