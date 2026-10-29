// Types of scripts/prototype-sync.mjs for the TypeScript tests.
export declare function syncPrototype(options?: { check?: boolean; from?: string; to?: string }): {
  status: 'copied' | 'same' | 'different' | 'vault-missing';
};
