jest.mock('./mempool-config.json', () => ({}), { virtual: true });
jest.mock('./src/logger.ts', () => ({}), { virtual: true });
jest.mock('./src/api/rbf-cache.ts', () => ({}), { virtual: true });
jest.mock('./src/api/mempool.ts', () => ({}), { virtual: true });
jest.mock('./src/api/memory-cache.ts', () => ({}), { virtual: true });
jest.mock('rust-gbt', () => ({ GbtGenerator: jest.fn(), GbtResult: jest.fn() }), { virtual: true });
