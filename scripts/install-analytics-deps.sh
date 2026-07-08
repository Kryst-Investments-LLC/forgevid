#!/bin/bash

# ForgeVid Analytics and Monitoring Dependencies Installation Script
echo "📊 Installing Analytics and Monitoring Dependencies..."

# Analytics Core
echo "📈 Installing analytics libraries..."
npm install --save \
  @google-analytics/data@^4.0.0 \
  mixpanel@^0.17.0 \
  amplitude-js@^8.21.9 \
  hotjar@^1.0.1

# Performance Monitoring
echo "⚡ Installing performance monitoring..."
npm install --save \
  @sentry/nextjs@^7.74.1 \
  @sentry/profiling-node@^1.2.1 \
  newrelic@^10.4.0 \
  prom-client@^14.2.0

# Error Tracking
echo "🐛 Installing error tracking..."
npm install --save \
  bugsnag@^7.20.2 \
  rollbar@^2.26.2

# A/B Testing
echo "🧪 Installing A/B testing libraries..."
npm install --save \
  @growthbook/growthbook@^0.33.0 \
  optimizely-sdk@^4.9.2

# Database Analytics
echo "🗃️ Installing database analytics..."
npm install --save \
  @clickhouse/client@^0.2.5 \
  elasticsearch@^16.7.3

# Real-time Analytics
echo "📡 Installing real-time analytics..."
npm install --save \
  kafka-node@^5.0.0 \
  apache-kafka@^0.4.0

echo "✅ Analytics dependencies installed successfully!"

