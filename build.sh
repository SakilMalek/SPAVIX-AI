#!/bin/bash
set -e

echo "=========================================="
echo "SPAVIX Build Script - $(date)"
echo "=========================================="

echo ""
echo "Step 1: Python Setup"
echo "Python version:"
python3 --version

echo ""
echo "Step 2: Installing Python dependencies..."
python3 -m pip install --upgrade pip setuptools wheel
python3 -m pip install -r requirements.txt

echo ""
echo "Step 3: Verifying Python packages..."
python3 -c "import sys; print('Python executable:', sys.executable)"
python3 -c "import requests; print('✓ requests installed')"
python3 -c "import google.genai; print('✓ google-genai installed')"
python3 -c "import PIL; print('✓ Pillow installed')"
python3 -c "import dotenv; print('✓ python-dotenv installed')"

echo ""
echo "Step 4: Installing Node dependencies..."
npm install

echo ""
echo "Step 5: Building application..."
npm run build

echo ""
echo "=========================================="
echo "Build complete! $(date)"
echo "=========================================="
