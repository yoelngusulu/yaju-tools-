/**
 * Lightweight PDF signature check. This rejects obvious non-PDF uploads before
 * they reach pdf-lib or QPDF; it is not a substitute for parser validation.
 */
export function hasPdfSignature(
  bytes: Uint8Array | ArrayBuffer
): boolean {
  const view =
    bytes instanceof Uint8Array
      ? bytes
      : new Uint8Array(bytes);

  if (view.byteLength < 5) {
    return false;
  }

  return (
    view[0] === 0x25 &&
    view[1] === 0x50 &&
    view[2] === 0x44 &&
    view[3] === 0x46 &&
    view[4] === 0x2d
  );
}
