"use client";
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
export function useUsageTracking() {
    const [usage, setUsage] = useState(null);
    const [loading, setLoading] = useState(true);
    const { data: session } = useSession();
    useEffect(() => {
        if (!session?.user?.id) {
            setLoading(false);
            return;
        }
        async function fetchUsage() {
            try {
                const response = await fetch('/api/usage/analytics', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: session.user.id, // Get from auth context (already checked above)
                    }),
                });
                if (response.ok) {
                    const data = await response.json();
                    setUsage(data.usage);
                }
            }
            catch (error) {
                console.error('Failed to fetch usage:', error);
                // Show upgrade modal or error handling
                // This could trigger a modal component to show upgrade options
            }
            finally {
                setLoading(false);
            }
        }
        fetchUsage();
    }, [session?.user?.id]);
    return { usage, loading };
}
