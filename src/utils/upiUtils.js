// src/utils/upiUtils.js
import QRCode from 'qrcode';

/**
 * Generates standard UPI payment URL
 */
export const buildUPIPaymentURL = ({ upiId, payeeName, amount, note }) => {
  if (!upiId) return '';
  const cleanUpi = upiId.trim();
  const cleanName = encodeURIComponent(payeeName || 'Tuition Fee');
  const cleanNote = encodeURIComponent(note || 'Tuition Fee Payment');
  const cleanAmount = Number(amount || 0).toFixed(2);

  return `upi://pay?pa=${cleanUpi}&pn=${cleanName}&am=${cleanAmount}&cu=INR&tn=${cleanNote}`;
};

/**
 * Returns QR Code as PNG Base64 Data URL for embedding in jsPDF / Web UI
 */
export const generateQRCodeDataURL = async (text) => {
  if (!text) return null;
  try {
    return await QRCode.toDataURL(text, {
      width: 256,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });
  } catch (err) {
    console.error('Error generating QR code:', err);
    return null;
  }
};