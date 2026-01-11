#!/bin/bash

# =============================================================================
# Nuvio Streaming TV - Development Environment Setup Script
# =============================================================================
# This script initializes the development environment for the Nuvio Streaming
# TV application. It installs dependencies, sets up configuration, and starts
# the development server.
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored message
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Header
echo ""
echo "=============================================="
echo "  Nuvio Streaming TV - Development Setup"
echo "=============================================="
echo ""

# Check Node.js version
print_status "Checking Node.js version..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi
print_success "Node.js version: $(node -v)"

# Check npm
print_status "Checking npm..."
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm and try again."
    exit 1
fi
print_success "npm version: $(npm -v)"

# Check for .env.local file
print_status "Checking environment configuration..."
if [ ! -f ".env.local" ]; then
    print_warning ".env.local not found. Creating from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env.local
        print_warning "Please edit .env.local with your API keys:"
        echo "  - EXPO_PUBLIC_TRAKT_CLIENT_ID"
        echo "  - EXPO_PUBLIC_TRAKT_CLIENT_SECRET"
        echo "  - SENTRY_DSN (optional)"
        echo "  - POSTHOG_API_KEY (optional)"
    else
        print_warning "No .env.example found. You may need to create .env.local manually."
    fi
else
    print_success ".env.local exists"
fi

# Install dependencies
print_status "Installing dependencies..."
npm install --legacy-peer-deps

if [ $? -ne 0 ]; then
    print_warning "npm install failed, trying with --force..."
    npm install --force
fi

print_success "Dependencies installed successfully!"

# Check for Expo CLI
print_status "Checking Expo CLI..."
if ! command -v expo &> /dev/null && ! npx expo --version &> /dev/null; then
    print_warning "Expo CLI not found globally. Using npx expo instead."
fi

# Display available commands
echo ""
echo "=============================================="
echo "  Setup Complete!"
echo "=============================================="
echo ""
echo "Available commands:"
echo ""
echo "  ${GREEN}npm start${NC}          - Start Expo development server"
echo "  ${GREEN}npm run android${NC}    - Run on Android device/emulator"
echo "  ${GREEN}npm run ios${NC}        - Run on iOS simulator (Mac only)"
echo "  ${GREEN}npm test${NC}           - Run test suite"
echo "  ${GREEN}npm run test:watch${NC} - Run tests in watch mode"
echo ""
echo "For TV builds:"
echo ""
echo "  ${YELLOW}APP_VARIANT=tv npx expo start${NC}           - Start TV development server"
echo "  ${YELLOW}APP_VARIANT=tv npx expo run:android${NC}     - Run on Android TV"
echo "  ${YELLOW}APP_VARIANT=tv npx expo run:ios${NC}         - Run on tvOS"
echo ""
echo "Platform requirements:"
echo ""
echo "  - Android: Android Studio + Android SDK"
echo "  - iOS/tvOS: Xcode (Mac only)"
echo "  - Android TV: Android TV emulator or physical device"
echo "  - Apple TV: tvOS simulator or physical device"
echo ""
echo "API Keys needed (configure in .env.local):"
echo ""
echo "  - EXPO_PUBLIC_TRAKT_CLIENT_ID (from trakt.tv)"
echo "  - EXPO_PUBLIC_TRAKT_CLIENT_SECRET (from trakt.tv)"
echo "  - TMDB API key (configure in app Settings)"
echo "  - MDBList API key (optional, configure in app)"
echo ""
echo "=============================================="

# Optional: Start the development server
read -p "Would you like to start the development server now? (y/n): " START_SERVER

if [[ "$START_SERVER" =~ ^[Yy]$ ]]; then
    print_status "Starting Expo development server..."
    echo ""
    npx expo start
fi
