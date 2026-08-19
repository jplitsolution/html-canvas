import { randomBytes } from 'crypto';

/** Our minted click_id length (partner CG / ext_id friendly). */
export const CLICK_ID_LENGTH = 24;

const ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const ALPHABET_LEN = ALPHABET.length;
/** Largest multiple of 62 that fits in a byte — skip the rest to avoid modulo bias. */
const MAX_UNBIASED = 256 - (256 % ALPHABET_LEN);

/**
 * 24-char id: letters + digits only (A-Za-z0-9). No `-` / `_`.
 */
export const mintClickId = (length = CLICK_ID_LENGTH) => {
  let out = '';
  while (out.length < length) {
    const bytes = randomBytes(length - out.length);
    for (let i = 0; i < bytes.length && out.length < length; i += 1) {
      if (bytes[i] >= MAX_UNBIASED) continue;
      out += ALPHABET[bytes[i] % ALPHABET_LEN];
    }
  }
  return out;
};
