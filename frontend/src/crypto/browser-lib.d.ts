export function stringToBuffer(str: string): Uint8Array;
export function bufferToString(buf: BufferSource): string;
export function encodeBuffer(buf: BufferSource): string;
export function decodeBuffer(base64: string): Uint8Array;
export function getRandomBytes(len: number): Uint8Array;