import { base64AArrayBuffer } from '../services/evidencias';

jest.mock('../services/supabase', () => ({ supabase: {} }));

describe('base64AArrayBuffer', () => {
  it('decodifica base64 ASCII a ArrayBuffer', () => {
    const buffer = base64AArrayBuffer('aG9sYQ==');
    expect(new TextDecoder().decode(buffer)).toBe('hola');
  });

  it('decodifica base64 vacío a un buffer vacío', () => {
    expect(base64AArrayBuffer('').byteLength).toBe(0);
  });

  it('preserva bytes binarios (imagen JPEG truncada)', () => {
    // Cabecera JPEG: FF D8 FF (base64: /9j/)
    const buffer = new Uint8Array(base64AArrayBuffer('/9j/'));
    expect(buffer[0]).toBe(0xff);
    expect(buffer[1]).toBe(0xd8);
    expect(buffer[2]).toBe(0xff);
  });
});
