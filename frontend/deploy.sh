#!/bin/bash

# Vercel Deployment Script

echo "🚀 Starting Vercel deployment..."

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm i -g vercel
fi

# Run type checking
echo "📝 Running type check..."
npm run type-check
if [ $? -ne 0 ]; then
    echo "❌ Type check failed. Please fix errors before deploying."
    exit 1
fi

# Run linting
echo "🔍 Running lint check..."
npm run lint
if [ $? -ne 0 ]; then
    echo "❌ Lint check failed. Please fix errors before deploying."
    exit 1
fi

# Build locally to test
echo "🔨 Testing build..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix errors before deploying."
    exit 1
fi

# Deploy to Vercel
echo "🌐 Deploying to Vercel..."
if [ "$1" == "--prod" ]; then
    echo "Deploying to production..."
    vercel --prod
else
    echo "Deploying to preview..."
    vercel
fi

echo "✅ Deployment complete!"