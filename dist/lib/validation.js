import { z } from 'zod';
export const domainSchema = z.string().refine((val) => /^([a-z0-9-]+\.)+[a-z]{2,}$/.test(val), { message: 'Invalid domain format' });
export function validateDomain(domain) {
    return domainSchema.safeParse(domain);
}
