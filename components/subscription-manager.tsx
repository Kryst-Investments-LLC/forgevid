'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { PRICING_PLANS } from '@/lib/stripe';
import { CreditCard, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface UserSubscription {
  planId: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

export default function SubscriptionManager() {
  const { data: session } = useSession();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.id) {
      fetchSubscription();
    }
  }, [session]);

  const fetchSubscription = async () => {
    try {
      const response = await fetch('/api/user/subscription');
      if (response.ok) {
        const data = await response.json();
        setSubscription(data.subscription);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    setActionLoading(planId);

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
      setActionLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    setActionLoading('manage');

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
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          <span className="ml-2 text-gray-600">Loading subscription...</span>
        </div>
      </div>
    );
  }

  const currentPlan = subscription ? PRICING_PLANS[subscription.planId as keyof typeof PRICING_PLANS] : PRICING_PLANS.FREE;
  const isActive = subscription?.status === 'active';

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Subscription</h2>
        <div className="flex items-center">
          {isActive ? (
            <CheckCircle className="h-6 w-6 text-green-500 mr-2" />
          ) : (
            <AlertCircle className="h-6 w-6 text-yellow-500 mr-2" />
          )}
          <span className={`font-semibold ${isActive ? 'text-green-600' : 'text-yellow-600'}`}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Plan</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl font-bold text-gray-900">{currentPlan.name}</span>
              <span className="text-2xl font-bold text-purple-600">
                ${currentPlan.price}
                <span className="text-sm text-gray-500">/month</span>
              </span>
            </div>
            <p className="text-gray-600 mb-4">{currentPlan.credits} video generations per month</p>
            
            {subscription && (
              <div className="text-sm text-gray-500">
                <p>Next billing: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</p>
                {subscription.stripeSubscriptionId && (
                  <p>Subscription ID: {subscription.stripeSubscriptionId.slice(-8)}</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Plan Features</h3>
          <ul className="space-y-2">
            {currentPlan.features.map((feature, index) => (
              <li key={index} className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          {currentPlan.id !== 'free' && (
            <button
              onClick={handleManageSubscription}
              disabled={actionLoading === 'manage'}
              className="flex items-center justify-center px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {actionLoading === 'manage' ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <CreditCard className="h-5 w-5 mr-2" />
              )}
              Manage Subscription
            </button>
          )}

          {currentPlan.id === 'free' && (
            <button
              onClick={() => handleUpgrade('starter')}
              disabled={actionLoading === 'starter'}
              className="flex items-center justify-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {actionLoading === 'starter' ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <CreditCard className="h-5 w-5 mr-2" />
              )}
              Upgrade to Starter
            </button>
          )}

          <a
            href="/pricing"
            className="flex items-center justify-center px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            View All Plans
          </a>
        </div>
      </div>
    </div>
  );
}
