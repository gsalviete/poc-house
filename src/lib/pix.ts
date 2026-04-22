import QRCode from 'qrcode';

interface PixPayloadParams {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  amountCents: number;
  txId?: string;
}

function pad(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
    }
    crc &= 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function generatePixPayload(params: PixPayloadParams): string {
  const { pixKey, merchantName, merchantCity, amountCents, txId } = params;
  const amount = (amountCents / 100).toFixed(2);

  const gui = pad('00', 'br.gov.bcb.pix');
  const key = pad('01', pixKey);
  const merchantAccountInfo = pad('26', gui + key);

  let payload = '';
  payload += pad('00', '01');
  payload += merchantAccountInfo;
  payload += pad('52', '0000');
  payload += pad('53', '986');
  payload += pad('54', amount);
  payload += pad('58', 'BR');
  payload += pad('59', merchantName.substring(0, 25).toUpperCase());
  payload += pad('60', merchantCity.substring(0, 15).toUpperCase());

  if (txId) {
    payload += pad('62', pad('05', txId.substring(0, 25)));
  }

  payload += '6304';
  payload += crc16(payload);

  return payload;
}

export async function generatePixQRCode(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' },
  });
}

export function getPixConfig() {
  return {
    pixKey: process.env.PIX_KEY || '',
    merchantName: process.env.PIX_MERCHANT_NAME || 'NOME',
    merchantCity: process.env.PIX_MERCHANT_CITY || 'CIDADE',
  };
}
