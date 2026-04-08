// ── Jest configuration ──
// The backend is pure ESM (package.json "type": "module") so Jest runs
// through Node's --experimental-vm-modules flag (set in the "test" script).
// No Babel transform is required — Node loads the source files natively.
//
// To run:    npm test
// To debug:  npm test -- tests/e2e.test.js

export default {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  // Don't transform anything — we use native ESM.
  transform: {},
  // Show each individual test result.
  verbose: true,
  // Run tests serially so the shared mock DB state stays deterministic.
  maxWorkers: 1,
  // Give network/service timeouts a bit of headroom.
  testTimeout: 15000,
};
