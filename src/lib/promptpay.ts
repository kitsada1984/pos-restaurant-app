/**
 * Standard PromptPay EMVCo QR Code Payload Generator
 * Compliant with Bank of Thailand & EMVCo Standard
 */

// CRC16-CCITT (0xFFFF polynomial 0x1021)
function crc16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    let c = data.charCodeAt(i);
    crc ^= c << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  let hex = (crc & 0xffff).toString(16).toUpperCase();
  return hex.padStart(4, '0');
}

function formatTag(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

export function generatePromptPayPayload(
  target: string, // Phone number or Tax ID / National ID
  amount?: number | null // Optional amount for dynamic QR
): string {
  const cleanTarget = target.replace(/[^0-9]/g, '');
  if (!cleanTarget) return '';

  let formattedTarget = '';
  let targetType = '';

  if (cleanTarget.length === 10 || (cleanTarget.length === 9 && cleanTarget.startsWith('8'))) {
    // Thai Mobile Phone (e.g. 0812345678 -> 0066812345678)
    const mobileNo = cleanTarget.startsWith('0') ? cleanTarget.substring(1) : cleanTarget;
    formattedTarget = `0066${mobileNo}`.padStart(13, '0');
    targetType = '01'; // 01 for Mobile
  } else if (cleanTarget.length === 13) {
    // Thai National ID / Tax ID
    formattedTarget = cleanTarget;
    targetType = '02'; // 02 for Tax ID / Citizen ID
  } else {
    // Default fallback
    formattedTarget = cleanTarget.padStart(13, '0');
    targetType = '01';
  }

  // Merchant Account Info (Tag 29 for PromptPay)
  const aid = formatTag('00', 'A000000677010111');
  const targetTag = formatTag(targetType, formattedTarget);
  const tag29 = formatTag('29', `${aid}${targetTag}`);

  // Base Payload
  let payload = '';
  payload += formatTag('00', '01'); // Payload Format Indicator
  payload += formatTag('01', amount ? '12' : '11'); // Point of Initiation: 11 = Static, 12 = Dynamic
  payload += tag29;
  payload += formatTag('53', '764'); // Transaction Currency = THB (764)

  if (amount !== undefined && amount !== null && amount > 0) {
    const formattedAmount = amount.toFixed(2);
    payload += formatTag('54', formattedAmount); // Transaction Amount
  }

  payload += formatTag('58', 'TH'); // Country Code = TH

  // Checksum Tag 63
  const payloadWithChecksumPrefix = `${payload}6304`;
  const checksum = crc16(payloadWithChecksumPrefix);

  return `${payloadWithChecksumPrefix}${checksum}`;
}
