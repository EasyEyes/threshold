declare module "brotli/decompress.js" {
  const decompress: (buffer: Uint8Array, outSize?: number) => Uint8Array;
  export default decompress;
}
