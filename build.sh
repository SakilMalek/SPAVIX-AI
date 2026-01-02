#!/bin/bash
set -e

echo "Installing Python dependencies..."
pip install -r requirements.txt || python3 -m pip install -r requirements.txt || echo "Warning: Python dependencies may not be installed"

echo "Installing Node dependencies..."
npm install

echo "Building application..."
npm run build

echo "Build complete!"
