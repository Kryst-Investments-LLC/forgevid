#!/bin/bash

# ForgeVid Media Processing Dependencies Installation Script
echo "🎬 Installing Media Processing Dependencies..."

# Video Processing Core
echo "🎥 Installing video processing libraries..."
npm install --save \
  fluent-ffmpeg@^2.1.2 \
  @ffmpeg/ffmpeg@^0.12.6 \
  @ffmpeg/util@^0.12.1 \
  node-ffmpeg@^0.6.2 \
  ffprobe@^1.1.2 \
  videoshow@^0.1.11

# Image Processing
echo "🖼️ Installing image processing libraries..."
npm install --save \
  sharp@^0.32.6 \
  jimp@^0.22.10 \
  canvas@^2.11.2 \
  fabric@^5.3.0 \
  konva@^9.2.0

# Audio Processing
echo "🎵 Installing audio processing libraries..."
npm install --save \
  node-wav@^0.0.2 \
  audiobuffer-to-wav@^1.0.0 \
  web-audio-api@^0.2.2 \
  tone@^14.7.77

# Cloud Storage
echo "☁️ Installing cloud storage libraries..."
npm install --save \
  @aws-sdk/client-s3@^3.400.0 \
  @aws-sdk/s3-request-presigner@^3.400.0 \
  cloudinary@^1.40.0 \
  @google-cloud/storage@^7.1.0

# Streaming and CDN
echo "📡 Installing streaming libraries..."
npm install --save \
  hls.js@^1.4.10 \
  video.js@^8.5.2 \
  dash.js@^4.7.2

echo "✅ Media processing dependencies installed successfully!"

