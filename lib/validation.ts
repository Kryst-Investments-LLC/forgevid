import { z, ZodSchema } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

// ── Domain validation ────────────────────────────────────────────────
export const domainSchema = z.string().refine(
  (val) => /^([a-z0-9-]+\.)+[a-z]{2,}$/.test(val),
  { message: 'Invalid domain format' }
);

export function validateDomain(domain: string) {
  return domainSchema.safeParse(domain);
}

// ── Common reusable schemas ──────────────────────────────────────────

/** Email: trimmed, lowercased, max 255 */
export const emailSchema = z
  .string()
  .email('Invalid email format')
  .max(255)
  .transform(v => v.toLowerCase().trim());

/** Password: NIST 800-63B compliant */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character');

/** Pagination params */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/** CUID id param */
export const idSchema = z.string().min(1).max(30);

/** Safe text input: trims whitespace, strips angle brackets */
export const safeTextSchema = z
  .string()
  .max(5000)
  .transform(v => v.trim().replace(/[<>]/g, ''));

// ── Middleware: validate request body/query against a Zod schema ─────

/**
 * Wraps an API handler and validates the request body (POST/PUT/PATCH)
 * or query params (GET) against the given Zod schema.
 *
 * Usage:
 *   export const POST = withValidation(myZodSchema)(async (req, validatedData) => { ... });
 */
export function withValidation<T extends ZodSchema>(schema: T) {
  return function validationWrapper(
    handler: (req: NextRequest, data: z.infer<T>, context?: any) => Promise<NextResponse>
  ) {
    return async function validatedHandler(req: NextRequest, context?: any): Promise<NextResponse> {
      let rawData: unknown;

      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        try {
          rawData = await req.json();
        } catch {
          return NextResponse.json(
            { error: 'Invalid JSON body' },
            { status: 400 }
          );
        }
      } else {
        // GET — parse from search params
        const params = Object.fromEntries(req.nextUrl.searchParams.entries());
        rawData = params;
      }

      const result = schema.safeParse(rawData);
      if (!result.success) {
        const errors = result.error.issues.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return NextResponse.json(
          { error: 'Validation failed', details: errors },
          { status: 400 }
        );
      }

      return handler(req, result.data, context);
    };
  };
}

