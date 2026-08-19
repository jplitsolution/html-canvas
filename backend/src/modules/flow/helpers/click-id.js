import { randomBytes } from 'crypto';

/** Our minted click_id length (partner CG / ext_id friendly). */
export const CLICK_ID_LENGTH = 24;

/**
 * 24-char URL-safe id: 18 random bytes → base64url (A-Za-z0-9-_).
 */
export const mintClickId = () => randomBytes(18).toString('base64url');
