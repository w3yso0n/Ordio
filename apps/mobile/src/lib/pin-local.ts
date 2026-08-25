import * as Crypto from 'expo-crypto';
import { getSecureItem, setSecureItem } from './secure-storage';

function keyFor(userId: string) {
  return `cashier-pin.${userId}`;
}

export async function saveLocalPin(userId: string, pin: string) {
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${userId}:${pin}`);
  await setSecureItem(keyFor(userId), digest);
}

export async function verifyLocalPin(userId: string, pin: string) {
  const stored = await getSecureItem(keyFor(userId));
  if (!stored) return false;
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${userId}:${pin}`);
  return stored === digest;
}
