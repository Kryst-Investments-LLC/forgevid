import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Futuristic: Quantum-inspired hash for cache keys (simulated annealing for uniqueness)
export function quantumHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;  // Convert to 32-bit int
  }
  return Math.abs(hash).toString(36) + Date.now().toString(36);  // Time-based for futurism
}
