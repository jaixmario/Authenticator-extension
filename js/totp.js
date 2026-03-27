// Web Crypto API based TOTP generator
async function generateTOTP(secretBase32, interval = 30) {
  try {
    const keyBytes = base32ToUint8Array(secretBase32.replace(/\s+/g, ''));
    
    // Calculate current time step
    const epoch = Math.round(Date.now() / 1000.0);
    const timeStep = Math.floor(epoch / interval);
    
    // Convert time step to 8-byte array (big endian)
    const timeBytes = new Uint8Array(8);
    let temp = timeStep;
    for (let i = 7; i >= 0; i--) {
      timeBytes[i] = temp & 0xff;
      temp >>= 8;
    }

    // Import the secret key
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );

    // Generate HMAC-SHA1 signature
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, timeBytes);
    const hash = new Uint8Array(signature);

    // Dynamic truncation
    const offset = hash[hash.length - 1] & 0xf;
    const binary = (
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff)
    );

    // Get 6 digit code
    const totp = binary % 1000000;
    return totp.toString().padStart(6, '0');
  } catch (error) {
    console.error('TOTP Generation Error:', error);
    return 'ERROR';
  }
}
