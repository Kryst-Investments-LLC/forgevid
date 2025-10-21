#!/bin/bash

# ForgeVid Real-time Collaboration Dependencies Installation Script
echo "🤝 Installing Real-time Collaboration Dependencies..."

# WebSocket and Real-time
echo "⚡ Installing WebSocket and real-time libraries..."
npm install --save \
  socket.io@^4.7.2 \
  socket.io-client@^4.7.2 \
  ws@^8.14.2 \
  uws@^20.30.0

# Conflict Resolution and CRDT
echo "🔄 Installing conflict resolution libraries..."
npm install --save \
  yjs@^13.6.7 \
  y-websocket@^1.5.0 \
  y-protocols@^1.0.5 \
  lib0@^0.2.85 \
  sharedb@^3.0.0-beta.7

# Presence and Awareness
echo "👥 Installing presence tracking libraries..."
npm install --save \
  y-presence@^1.0.0 \
  awareness-protocol@^1.0.0

# Video Conferencing
echo "📹 Installing video conferencing libraries..."
npm install --save \
  simple-peer@^9.11.1 \
  peerjs@^1.5.2 \
  mediasoup-client@^3.6.51

# Communication
echo "💬 Installing communication libraries..."
npm install --save \
  @slack/web-api@^6.9.0 \
  discord.js@^14.13.0 \
  microsoft-graph-client@^3.0.7

echo "✅ Collaboration dependencies installed successfully!"

