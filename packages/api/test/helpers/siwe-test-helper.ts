import { Wallet } from 'ethers';
import { SiweMessage } from 'siwe';

const TEST_PRIVATE_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

export function createTestWallet(
  privateKey: string = TEST_PRIVATE_KEY
): Wallet {
  return new Wallet(privateKey);
}

export function generateSiweMessage(
  wallet: Wallet,
  nonce: string,
  domain: string = 'localhost:3000'
): string {
  const siweMessage = new SiweMessage({
    domain,
    address: wallet.address,
    statement: 'Sign in with Ethereum',
    uri: `http://${domain}`,
    version: '1',
    chainId: 1,
    nonce,
    issuedAt: new Date().toISOString(),
  });

  return siweMessage.prepareMessage();
}

export async function signSiweMessage(
  wallet: Wallet,
  message: string
): Promise<string> {
  return await wallet.signMessage(message);
}

export function extractCookieValue(
  cookies: string[],
  cookieName: string
): string {
  const cookie = cookies?.find((c) => c.startsWith(`${cookieName}=`));
  if (!cookie) {
    throw new Error(`Cookie ${cookieName} not found`);
  }
  const match = cookie.match(new RegExp(`${cookieName}=([^;]+)`));
  return match ? match[1] : '';
}
