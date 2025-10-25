#!/bin/bash
# Build script for sexy.pivoine.art Docker image

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
IMAGE_NAME="sexy.pivoine.art"
TAG="latest"
PUSH=false
PLATFORM=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -t|--tag)
      TAG="$2"
      shift 2
      ;;
    -n|--name)
      IMAGE_NAME="$2"
      shift 2
      ;;
    -p|--push)
      PUSH=true
      shift
      ;;
    --platform)
      PLATFORM="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  -t, --tag TAG        Set image tag (default: latest)"
      echo "  -n, --name NAME      Set image name (default: sexy.pivoine.art)"
      echo "  -p, --push           Push image after build"
      echo "  --platform PLATFORM  Build for specific platform (e.g., linux/amd64,linux/arm64)"
      echo "  -h, --help           Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0                                    # Build with defaults"
      echo "  $0 -t v1.0.0                         # Build with version tag"
      echo "  $0 --platform linux/amd64,linux/arm64 -p  # Multi-platform build and push"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

FULL_IMAGE="${IMAGE_NAME}:${TAG}"

echo -e "${GREEN}=== Building Docker Image ===${NC}"
echo "Image: ${FULL_IMAGE}"
echo "Platform: ${PLATFORM:-default}"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}Error: Docker is not running${NC}"
  exit 1
fi

# Build command
BUILD_CMD="docker build"

if [ -n "$PLATFORM" ]; then
  # Multi-platform build requires buildx
  echo -e "${YELLOW}Using buildx for multi-platform build${NC}"
  BUILD_CMD="docker buildx build --platform ${PLATFORM}"

  if [ "$PUSH" = true ]; then
    BUILD_CMD="${BUILD_CMD} --push"
  fi
else
  # Regular build
  if [ "$PUSH" = true ]; then
    echo -e "${YELLOW}Note: --push only works with multi-platform builds. Use 'docker push' after build.${NC}"
  fi
fi

# Execute build
echo -e "${GREEN}Building...${NC}"
$BUILD_CMD -t "${FULL_IMAGE}" .

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Build successful!${NC}"
  echo "Image: ${FULL_IMAGE}"

  # Show image size
  if [ -z "$PLATFORM" ]; then
    SIZE=$(docker images "${FULL_IMAGE}" --format "{{.Size}}")
    echo "Size: ${SIZE}"
  fi

  # Push if requested and not multi-platform
  if [ "$PUSH" = true ] && [ -z "$PLATFORM" ]; then
    echo -e "${GREEN}Pushing image...${NC}"
    docker push "${FULL_IMAGE}"
    if [ $? -eq 0 ]; then
      echo -e "${GREEN}✓ Push successful!${NC}"
    else
      echo -e "${RED}✗ Push failed${NC}"
      exit 1
    fi
  fi

  echo ""
  echo -e "${GREEN}Next steps:${NC}"
  echo "1. Run locally:"
  echo "   docker run -d -p 3000:3000 --env-file .env.production ${FULL_IMAGE}"
  echo ""
  echo "2. Run with docker-compose:"
  echo "   docker-compose -f docker-compose.production.yml up -d"
  echo ""
  echo "3. View logs:"
  echo "   docker logs -f <container-name>"
else
  echo -e "${RED}✗ Build failed${NC}"
  exit 1
fi
