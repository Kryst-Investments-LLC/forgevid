'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { PRICING_PLANS } from '@/lib/stripe';
import { Check, X } from 'lucide-react';

export default function PricingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (planId: string) => {
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    if (planId === 'free') {
      return; // Free plan doesn't require payment
    }

    setLoading(planId);

    try {
      const response = await fetch('/api/payments/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planId }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('Failed to start checkout process. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    setLoading('manage');

    try {
      const response = await fetch('/api/payments/customer-portal', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create customer portal session');
      }
    } catch (error) {
      console.error('Error creating customer portal session:', error);
      alert('Failed to open customer portal. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-6">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Start creating amazing AI-generated videos today. Upgrade or downgrade at any time.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {Object.entries(PRICING_PLANS).map(([key, plan]) => (
            <div
              key={plan.id}
              className={`relative bg-white rounded-2xl shadow-2xl p-8 ${
                plan.id === 'pro' ? 'ring-2 ring-purple-500 scale-105' : ''
              }`}
            >
              {plan.id === 'pro' && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-purple-500 text-white px-4 py-2 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  ${plan.price}
                  <span className="text-lg text-gray-500">/month</span>
                </div>
                <p className="text-gray-600">
                  {plan.credits} video generations
                </p>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={loading === plan.id}
                className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 ${
                  plan.id === 'pro'
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : plan.id === 'free'
                    ? 'bg-gray-200 text-gray-700 cursor-not-allowed'
                    : 'bg-gray-900 hover:bg-gray-800 text-white'
                } ${loading === plan.id ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading === plan.id ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Processing...
                  </div>
                ) : plan.id === 'free' ? (
                  'Current Plan'
                ) : (
                  'Get Started'
                )}
              </button>
            </div>
          ))}
        </div>

        {session && (
          <div className="text-center mt-12">
            <button
              onClick={handleManageSubscription}
              disabled={loading === 'manage'}
              className="bg-gray-800 hover:bg-gray-700 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50"
            >
              {loading === 'manage' ? 'Loading...' : 'Manage Subscription'}
            </button>
          </div>
        )}

        <div className="mt-16 text-center">
          <h2 className="text-3xl font-bold text-white mb-8">
            Frequently Asked Questions
          </h2>
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-3">
                Can I change my plan anytime?
              </h3>
              <p className="text-gray-300">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-3">
                What happens to unused credits?
              </h3>
              <p className="text-gray-300">
                Credits reset monthly and don't roll over. We recommend using them before your billing cycle ends.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-3">
                Is there a free trial?
              </h3>
              <p className="text-gray-300">
                Yes! All paid plans come with a 7-day free trial. No credit card required to start.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
