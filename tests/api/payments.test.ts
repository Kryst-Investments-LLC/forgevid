import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST as POSTCheckout } from '@/app/api/payments/create-checkout-session/route';
import { POST as POSTPortal } from '@/app/api/payments/customer-portal/route';
import { prisma } from '@/lib/prisma';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/stripe', () => ({
  stripe: {
    checkout: {
      sessions: {
        create: jest.fn(),
      },
    },
    billingPortal: {
      sessions: {
        create: jest.fn(),
      },
    },
  },
  PRICING_PLANS: {
    starter: {
      id: 'starter',
      name: 'Starter',
      price: 19,
      stripePriceId: 'price_starter',
    },
    pro: {
      id: 'pro',
      name: 'Pro',
      price: 49,
      stripePriceId: 'price_pro',
    },
    free: {
      id: 'free',
      name: 'Free',
      price: 0,
      stripePriceId: null,
    },
  },
}));

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

const { getServerSession } = require('next-auth');
const { stripe, PRICING_PLANS } = require('@/lib/stripe');
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Payments API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
    });
  });

  describe('POST /api/payments/create-checkout-session', () => {
    it('should create checkout session for valid plan', async () => {
      (stripe.checkout.sessions.create as jest.Mock).mockResolvedValue({
        url: 'https://checkout.stripe.com/session_123',
      });

      const request = new NextRequest('http://localhost:3000/api/payments/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({ planId: 'pro' }),
      });

      const response = await POSTCheckout(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.url).toBe('https://checkout.stripe.com/session_123');
      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'subscription',
          line_items: [{ price: 'price_pro', quantity: 1 }],
          customer_email: 'test@example.com',
        })
      );
    });

    it('should return 400 for invalid plan ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/payments/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({ planId: 'invalid' }),
      });

      const response = await POSTCheckout(request);
      expect(response.status).toBe(400);
    });

    it('should return 400 for free plan', async () => {
      const request = new NextRequest('http://localhost:3000/api/payments/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({ planId: 'free' }),
      });

      const response = await POSTCheckout(request);
      expect(response.status).toBe(400);
    });

    it('should return 401 for unauthenticated users', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/payments/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({ planId: 'pro' }),
      });

      const response = await POSTCheckout(request);
      expect(response.status).toBe(401);
    });

    it('should return 400 for missing planId', async () => {
      const request = new NextRequest('http://localhost:3000/api/payments/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POSTCheckout(request);
      expect(response.status).toBe(400);
    });

    it('should handle Stripe errors gracefully', async () => {
      (stripe.checkout.sessions.create as jest.Mock).mockRejectedValue(
        new Error('Stripe API error')
      );

      const request = new NextRequest('http://localhost:3000/api/payments/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({ planId: 'pro' }),
      });

      const response = await POSTCheckout(request);
      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/payments/customer-portal', () => {
    it('should create portal session for user with subscription', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        subscription: {
          stripeCustomerId: 'cus_123',
        },
      } as any);

      (stripe.billingPortal.sessions.create as jest.Mock).mockResolvedValue({
        url: 'https://billing.stripe.com/session_123',
      });

      const request = new NextRequest('http://localhost:3000/api/payments/customer-portal', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POSTPortal(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.url).toBe('https://billing.stripe.com/session_123');
      expect(stripe.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_123',
        return_url: expect.any(String),
      });
    });

    it('should return 401 for unauthenticated users', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/payments/customer-portal', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POSTPortal(request);
      expect(response.status).toBe(401);
    });

    it('should return 400 for users without subscription', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        subscription: null,
      } as any);

      const request = new NextRequest('http://localhost:3000/api/payments/customer-portal', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POSTPortal(request);
      expect(response.status).toBe(400);
    });

    it('should return 500 on Stripe errors', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        subscription: {
          stripeCustomerId: 'cus_123',
        },
      } as any);

      (stripe.billingPortal.sessions.create as jest.Mock).mockRejectedValue(
        new Error('Stripe API error')
      );

      const request = new NextRequest('http://localhost:3000/api/payments/customer-portal', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POSTPortal(request);
      expect(response.status).toBe(500);
    });
  });
});

