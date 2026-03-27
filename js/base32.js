function base32ToUint8Array(base32) {
  const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let index = 0;
  const output = new Uint8Array(Math.ceil(base32.length * 5 / 8));

  for (let i = 0; i < base32.length; i++) {
    const char = base32[i].toUpperCase();
    if (char === '=') break;
    
    const charIndex = base32chars.indexOf(char);
    if (charIndex === -1) {
      throw new Error('Invalid Base32 character: ' + char);
    }
    
    value = (value << 5) | charIndex;
    bits += 5;
    
    if (bits >= 8) {
      output[index++] = (value >>> (bits - 8)) & 255;
      bits -= 8;
    }
  }
  return output.slice(0, index);
}
