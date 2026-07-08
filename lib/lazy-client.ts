/**
 * Defer construction of an SDK client until first use.
 *
 * SDK clients (OpenAI, Stripe) throw at construction when their API key is
 * missing. Constructing them at module scope therefore breaks `next build`,
 * which imports every route to collect page data — and it breaks any deploy
 * where a secret is only present at runtime.
 *
 * The returned proxy looks and behaves like the client, but the factory (and
 * any "missing key" error) is deferred to the first property access.
 */
export function lazyClient<T extends object>(factory: () => T): T {
  let instance: T | null = null;

  return new Proxy({} as T, {
    get(_target, prop) {
      if (!instance) instance = factory();
      const value = (instance as any)[prop];
      // Bind methods so they keep the real client as `this`.
      return typeof value === 'function' ? value.bind(instance) : value;
    },
  });
}
