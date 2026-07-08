export type UserRole = 'ADMIN' | 'USER' | 'EDITOR';

// Futuristic: Quantum state for cache versioning
export interface QuantumCache {
  key: string;
  timestamp: number;
  version: string;
}
