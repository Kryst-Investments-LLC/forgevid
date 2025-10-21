'use client';
import * as Sentry from '@sentry/nextjs';
import { Component } from 'react';
export class ErrorBoundary extends Component {
    state = { hasError: false };
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    componentDidCatch(error, errorInfo) {
        Sentry.captureException(error, { extra: errorInfo });
    }
    render() {
        if (this.state.hasError) {
            return this.props.fallback || <div>Something went wrong.</div>;
        }
        return this.props.children;
    }
}
