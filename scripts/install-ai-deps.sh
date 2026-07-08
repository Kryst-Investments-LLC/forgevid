#!/bin/bash

# ForgeVid AI Dependencies Installation Script
echo "🤖 Installing AI and Machine Learning Dependencies..."

# Core AI dependencies
echo "📦 Installing OpenAI and AI processing libraries..."
npm install --save \
  openai@^4.20.1 \
  @huggingface/transformers@^2.6.0 \
  @tensorflow/tfjs@^4.10.0 \
  @tensorflow/tfjs-node@^4.10.0 \
  @mediapipe/tasks-vision@^0.10.0 \
  @mediapipe/tasks-audio@^0.10.0 \
  canvas@^2.11.2 \
  sharp@^0.32.6

# Voice and Audio Processing
echo "🎙️ Installing voice synthesis and audio processing..."
npm install --save \
  node-ffmpeg@^0.6.2 \
  fluent-ffmpeg@^2.1.2 \
  @ffmpeg/ffmpeg@^0.12.6 \
  @ffmpeg/util@^0.12.1 \
  web-audio-api@^0.2.2 \
  audiobuffer-to-wav@^1.0.0

# Computer Vision
echo "👁️ Installing computer vision libraries..."
npm install --save \
  opencv4nodejs@^5.6.0 \
  jimp@^0.22.10 \
  face-api.js@^0.22.2

# Natural Language Processing
echo "📝 Installing NLP libraries..."
npm install --save \
  natural@^6.5.0 \
  compromise@^14.10.0 \
  sentiment@^5.0.2

echo "✅ AI dependencies installed successfully!"

