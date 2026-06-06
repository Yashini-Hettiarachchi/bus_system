// Polyfill shim for the `fetch` API in Vercel Node.js serverless functions.
// Node 18+ includes fetch natively, but this shim ensures compatibility with
// older Node versions that may still be used in some Vercel runtimes.
import fetch from 'node-fetch';
export default fetch;
