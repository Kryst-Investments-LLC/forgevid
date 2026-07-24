jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/ai/llm', () => ({
  hasLlmKey: jest.fn(() => true),
  llmModel: jest.fn(() => 'vision-test'),
  extractJson: jest.fn((value: string) => value),
  llm: {
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  },
}));

import { getServerSession } from 'next-auth';
import { llm } from '@/lib/ai/llm';
import { POST } from '@/app/api/listings/extract-screenshot/route';

const mockedSession = getServerSession as jest.Mock;
const mockedCreate = llm.chat.completions.create as jest.Mock;

function requestWith(files: File[], vertical = 'realestate') {
  return {
    formData: async () => {
      const form = new FormData();
      form.set('vertical', vertical);
      files.forEach((file) => form.append('files', file));
      return form;
    },
  } as any;
}

describe('POST /api/listings/extract-screenshot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSession.mockResolvedValue({ user: { id: 'user-1' } });
  });

  it('extracts reviewable facts without inventing missing values', async () => {
    mockedCreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            address: '1925 Jadd St, Belton, TX 76513',
            title: '',
            price: '$299,000',
            beds: 3,
            baths: 2,
            mileage: '',
            highlights: 'Brick exterior and fenced yard',
          }),
        },
      }],
    });
    const file = new File([Buffer.from('image')], 'listing.png', { type: 'image/png' });
    Object.defineProperty(file, 'arrayBuffer', {
      value: async () => Buffer.from('image').buffer,
    });
    const response = await POST(requestWith([file]));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      address: '1925 Jadd St, Belton, TX 76513',
      requiresReview: true,
    });
    expect(mockedCreate).toHaveBeenCalledTimes(1);
  });

  it('requires authentication', async () => {
    mockedSession.mockResolvedValue(null);
    const response = await POST(requestWith([]));
    expect(response.status).toBe(401);
  });

  it('rejects unsupported screenshot formats before calling AI', async () => {
    const file = new File([Buffer.from('pdf')], 'listing.pdf', { type: 'application/pdf' });
    const response = await POST(requestWith([file]));
    expect(response.status).toBe(415);
    expect(mockedCreate).not.toHaveBeenCalled();
  });
});
