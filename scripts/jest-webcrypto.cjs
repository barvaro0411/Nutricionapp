// Deno/modern browsers provide Web Crypto; Jest's Node VM may omit it.
if (!globalThis.crypto?.subtle) globalThis.crypto = require('node:crypto').webcrypto;
