#!/bin/bash
set -e

echo "Installing Python dependencies..."
python3 -m pip install --upgrade pip
python3 -m pip install -r requirements.txt

echo "Verifying Python packages..."
python3 -m pip list | grep -E "google-genai|requests|Pillow|python-dotenv"

echo "Installing Node dependencies..."
npm install

echo "Building application..."
npm run build

echo "Build complete!"
