#!/bin/bash

# ForgeVid Blockchain and Web3 Dependencies Installation Script
echo "⛓️ Installing Blockchain and Web3 Dependencies..."

# Core Web3 and Ethereum
echo "🌐 Installing Ethereum and Web3 libraries..."
npm install --save \
  ethers@^6.7.1 \
  web3@^4.1.1 \
  @web3-storage/w3up-client@^12.0.1 \
  @chainlink/contracts@^0.8.0

# IPFS and Decentralized Storage
echo "🗄️ Installing IPFS and decentralized storage..."
npm install --save \
  ipfs-http-client@^60.0.1 \
  ipfs-core@^0.18.1 \
  orbit-db@^0.28.7 \
  @textile/hub@^6.3.0

# NFT and Token Standards
echo "🎨 Installing NFT and token libraries..."
npm install --save \
  @openzeppelin/contracts@^4.9.3 \
  erc721a@^4.2.3 \
  @thirdweb-dev/sdk@^4.0.0

# Blockchain Analytics
echo "📊 Installing blockchain analytics..."
npm install --save \
  @moralisweb3/common-evm-utils@^2.22.1 \
  alchemy-sdk@^3.1.1

# Crypto Utilities
echo "🔐 Installing crypto utilities..."
npm install --save \
  crypto-js@^4.1.1 \
  elliptic@^6.5.4 \
  bip39@^3.1.0 \
  hdkey@^2.1.0

echo "✅ Blockchain dependencies installed successfully!"

