// src/utils/cryptoUtils.js
import CryptoJS from 'crypto-js';

// Application shared encryption secret key
const CHAT_SECRET_KEY = 'coaching_app_secure_chat_secret_key';

/**
 * Encrypt plain text message
 */
export const encryptMessage = (text) => {
  if (!text) return '';
  return CryptoJS.AES.encrypt(text, CHAT_SECRET_KEY).toString();
};

/**
 * Decrypt cipher text message
 */
export const decryptMessage = (cipherText) => {
  if (!cipherText) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, CHAT_SECRET_KEY);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    return originalText || '[Decryption Error]';
  } catch (e) {
    return '[Encrypted Message]';
  }
};