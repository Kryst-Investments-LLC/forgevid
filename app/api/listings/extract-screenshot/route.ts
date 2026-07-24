import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { extractJson, hasLlmKey, llm, llmModel } from '@/lib/ai/llm';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_FILES = 3;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const extractionSchema = z.object({
  address: z.string().max(300).optional().default(''),
  title: z.string().max(300).optional().default(''),
  price: z.string().max(80).optional().default(''),
  beds: z.number().min(0).max(50).nullable().optional(),
  baths: z.number().min(0).max(50).nullable().optional(),
  mileage: z.string().max(80).optional().default(''),
  highlights: z.string().max(1500).optional().default(''),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (!hasLlmKey()) {
    return NextResponse.json({ error: 'Screenshot extraction is not configured' }, { status: 503 });
  }

  let vertical = 'realestate';
  let files: File[] = [];
  try {
    const form = await req.formData();
    vertical = String(form.get('vertical') || 'realestate');
    files = form.getAll('files').filter((value): value is File => value instanceof File);
  } catch {
    return NextResponse.json({ error: 'Expected screenshot files' }, { status: 400 });
  }

  if (!['realestate', 'automotive', 'ecommerce'].includes(vertical)) {
    return NextResponse.json({ error: 'Unsupported vertical' }, { status: 400 });
  }
  if (files.length === 0 || files.length > MAX_FILES) {
    return NextResponse.json({ error: `Upload between 1 and ${MAX_FILES} screenshots` }, { status: 400 });
  }
  for (const file of files) {
    if (!IMAGE_TYPES.has(file.type)) {
      return NextResponse.json({ error: `Unsupported screenshot type: ${file.type || 'unknown'}` }, { status: 415 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: `${file.name} is larger than 10MB` }, { status: 413 });
    }
  }

  const imageParts = await Promise.all(files.map(async (file) => ({
    type: 'image_url' as const,
    image_url: {
      url: `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString('base64')}`,
      detail: 'high' as const,
    },
  })));

  try {
    const completion = await llm.chat.completions.create({
      model: llmModel('fast'),
      temperature: 0,
      max_tokens: 1200,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text:
              `Extract only facts visibly present in these ${vertical} screenshots. Never infer or invent missing values. ` +
              'Return JSON only with keys address, title, price, beds, baths, mileage, highlights. ' +
              'Use empty strings for missing text and null for missing numeric values. ' +
              'Highlights must combine visible features concisely without creating promotional claims.',
          },
          ...imageParts,
        ],
      }],
    });
    const raw = completion.choices[0]?.message?.content || '{}';
    const parsed = extractionSchema.safeParse(JSON.parse(extractJson(raw)));
    if (!parsed.success) {
      return NextResponse.json({ error: 'The screenshots did not produce reviewable listing details' }, { status: 422 });
    }
    return NextResponse.json({ ...parsed.data, requiresReview: true });
  } catch (error) {
    console.error('[listing-screenshot] extraction failed:', error);
    return NextResponse.json({ error: 'Could not extract details from those screenshots' }, { status: 502 });
  }
}
