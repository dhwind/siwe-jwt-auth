import { Wallet } from 'ethers';

export const TEST_WALLET_PRIVATE_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

export const TEST_NONCE = '1234567890';

export const TEST_WALLET_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

export function getTestWallet(): Wallet {
  return new Wallet(TEST_WALLET_PRIVATE_KEY);
}
