#!/bin/bash

set -e

# Get current git commit hash (short version)
COMMIT_HASH=$(git rev-parse --short HEAD)
echo "Building Backend Docker image with commit hash: $COMMIT_HASH"

# Set image registry and names
REGISTRY="ghcr.io/opcat-labs"
BACKEND_IMAGE="${REGISTRY}/mempool-backend"

# Set platform
PLATFORM="linux/amd64"

echo "========================================="
echo "Step 1: Running docker/init.sh to prepare files"
echo "========================================="
chmod +x docker/init.sh
docker/init.sh

echo ""
echo "========================================="
echo "Step 2: Building backend Docker image"
echo "========================================="
docker buildx build \
  --platform ${PLATFORM} \
  --tag ${BACKEND_IMAGE}:${COMMIT_HASH} \
  --tag ${BACKEND_IMAGE}:latest \
  --build-context rustgbt=./rust \
  --build-context backend=./backend \
  --build-arg commitHash=${COMMIT_HASH} \
  --load \
  ./backend/

echo ""
echo "========================================="
echo "Build completed successfully!"
echo "========================================="
echo ""
echo "Built images:"
echo "  Backend:  ${BACKEND_IMAGE}:${COMMIT_HASH}"
echo "            ${BACKEND_IMAGE}:latest"
echo ""
echo "To push images to registry, run:"
echo "  docker push ${BACKEND_IMAGE}:${COMMIT_HASH}"
echo "  docker push ${BACKEND_IMAGE}:latest"
echo ""
