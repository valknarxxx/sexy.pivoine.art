# Docker Deployment Guide

This guide covers building and deploying sexy.pivoine.art using Docker.

## Overview

The Dockerfile uses a multi-stage build process:

1. **Base stage**: Sets up Node.js and pnpm
2. **Builder stage**: Installs Rust, compiles WASM, builds all packages
3. **Runner stage**: Minimal production image with only runtime dependencies

## Prerequisites

- Docker 20.10+ with BuildKit support
- Docker Compose 2.0+ (optional, for orchestration)

## Building the Image

### Basic Build

```bash
docker build -t sexy.pivoine.art:latest .
```

### Build with Build Arguments

```bash
docker build \
  --build-arg NODE_ENV=production \
  -t sexy.pivoine.art:latest \
  .
```

### Multi-platform Build (for ARM64 and AMD64)

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t sexy.pivoine.art:latest \
  --push \
  .
```

## Running the Container

### Run with Environment Variables

```bash
docker run -d \
  --name sexy-pivoine-frontend \
  -p 3000:3000 \
  -e PUBLIC_API_URL=https://api.pivoine.art \
  -e PUBLIC_URL=https://sexy.pivoine.art \
  -e PUBLIC_UMAMI_ID=your-umami-id \
  -e LETTERSPACE_API_URL=https://api.letterspace.com/v1 \
  -e LETTERSPACE_API_KEY=your-api-key \
  -e LETTERSPACE_LIST_ID=your-list-id \
  sexy.pivoine.art:latest
```

### Run with Environment File

```bash
# Create .env.production from template
cp .env.production.example .env.production

# Edit .env.production with your values
nano .env.production

# Run container
docker run -d \
  --name sexy-pivoine-frontend \
  -p 3000:3000 \
  --env-file .env.production \
  sexy.pivoine.art:latest
```

## Docker Compose Deployment

### Using docker-compose.production.yml

```bash
# 1. Create environment file
cp .env.production.example .env.production

# 2. Edit environment variables
nano .env.production

# 3. Build and start
docker-compose -f docker-compose.production.yml up -d --build

# 4. View logs
docker-compose -f docker-compose.production.yml logs -f frontend

# 5. Stop services
docker-compose -f docker-compose.production.yml down
```

### Scale the Application

```bash
docker-compose -f docker-compose.production.yml up -d --scale frontend=3
```

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PUBLIC_API_URL` | Directus API backend URL | `https://api.pivoine.art` |
| `PUBLIC_URL` | Frontend application URL | `https://sexy.pivoine.art` |

### Optional Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PUBLIC_UMAMI_ID` | Umami analytics tracking ID | `abc123def-456` |
| `LETTERSPACE_API_URL` | Letterspace API endpoint | `https://api.letterspace.com/v1` |
| `LETTERSPACE_API_KEY` | Letterspace authentication key | `sk_live_...` |
| `LETTERSPACE_LIST_ID` | Mailing list identifier | `list_abc123` |
| `PORT` | Application port (inside container) | `3000` |
| `HOST` | Host binding | `0.0.0.0` |
| `NODE_ENV` | Node environment | `production` |

## Health Checks

The container includes a built-in health check that pings the HTTP server every 30 seconds:

```bash
# Check container health
docker inspect --format='{{.State.Health.Status}}' sexy-pivoine-frontend

# View health check logs
docker inspect --format='{{json .State.Health}}' sexy-pivoine-frontend | jq
```

## Logs and Debugging

### View Container Logs

```bash
# Follow logs
docker logs -f sexy-pivoine-frontend

# Last 100 lines
docker logs --tail 100 sexy-pivoine-frontend

# With timestamps
docker logs -f --timestamps sexy-pivoine-frontend
```

### Execute Commands in Running Container

```bash
# Open shell
docker exec -it sexy-pivoine-frontend sh

# Check Node.js version
docker exec sexy-pivoine-frontend node --version

# Check environment variables
docker exec sexy-pivoine-frontend env
```

### Debug Build Issues

```bash
# Build with no cache
docker build --no-cache -t sexy.pivoine.art:latest .

# Build specific stage for debugging
docker build --target builder -t sexy.pivoine.art:builder .

# Inspect builder stage
docker run -it --rm sexy.pivoine.art:builder sh
```

## Production Best Practices

### 1. Use Specific Tags

```bash
# Tag with version
docker build -t sexy.pivoine.art:1.0.0 .
docker tag sexy.pivoine.art:1.0.0 sexy.pivoine.art:latest
```

### 2. Image Scanning

```bash
# Scan for vulnerabilities (requires Docker Scout or Trivy)
docker scout cves sexy.pivoine.art:latest

# Or with Trivy
trivy image sexy.pivoine.art:latest
```

### 3. Resource Limits

```bash
docker run -d \
  --name sexy-pivoine-frontend \
  -p 3000:3000 \
  --memory="2g" \
  --cpus="2" \
  --env-file .env.production \
  sexy.pivoine.art:latest
```

### 4. Restart Policies

```bash
docker run -d \
  --name sexy-pivoine-frontend \
  --restart=unless-stopped \
  -p 3000:3000 \
  --env-file .env.production \
  sexy.pivoine.art:latest
```

### 5. Use Docker Secrets (Docker Swarm)

```bash
# Create secrets
echo "your-api-key" | docker secret create letterspace_api_key -

# Deploy with secrets
docker service create \
  --name sexy-pivoine-frontend \
  --secret letterspace_api_key \
  -p 3000:3000 \
  sexy.pivoine.art:latest
```

## Optimization Tips

### Reduce Build Time

1. **Use BuildKit cache mounts** (already enabled in Dockerfile)
2. **Leverage layer caching** - structure Dockerfile to cache dependencies
3. **Use `.dockerignore`** - exclude unnecessary files from build context

### Reduce Image Size

Current optimizations:
- Multi-stage build (builder artifacts not in final image)
- Production-only dependencies (`pnpm install --prod`)
- Minimal base image (`node:20.19.1-slim`)
- Only necessary build artifacts copied to runner

Image size breakdown:
```bash
docker images sexy.pivoine.art:latest
```

## CI/CD Integration

### GitHub Actions (Automated)

This repository includes automated GitHub Actions workflows for building, scanning, and managing Docker images.

**Pre-configured workflows:**
- **Build & Push** (`.github/workflows/docker-build-push.yml`)
  - Automatically builds and pushes to `ghcr.io/valknarxxx/sexy`
  - Triggers on push to main/develop, version tags, and PRs
  - Multi-platform builds (AMD64 + ARM64)
  - Smart tagging: latest, branch names, semver, commit SHAs

- **Security Scan** (`.github/workflows/docker-scan.yml`)
  - Daily vulnerability scans with Trivy
  - Reports to GitHub Security tab
  - Scans on every release

- **Cleanup** (`.github/workflows/cleanup-images.yml`)
  - Weekly cleanup of old untagged images
  - Keeps last 10 versions

**Using pre-built images:**

```bash
# Pull latest from GitHub Container Registry
docker pull ghcr.io/valknarxxx/sexy:latest

# Pull specific version
docker pull ghcr.io/valknarxxx/sexy:v1.0.0

# Run the image
docker run -d -p 3000:3000 --env-file .env.production ghcr.io/valknarxxx/sexy:latest
```

**Triggering builds:**

```bash
# Push to main → builds 'latest' tag
git push origin main

# Create version tag → builds semver tags
git tag v1.0.0 && git push origin v1.0.0

# Pull request → builds but doesn't push
```

See `.github/workflows/README.md` for detailed workflow documentation.

## Troubleshooting

### Build Fails at Rust Installation

**Problem**: Rust installation fails or times out

**Solution**:
- Check internet connectivity
- Use a Rust mirror if in restricted network
- Increase build timeout

### WASM Build Fails

**Problem**: `wasm-bindgen-cli` version mismatch

**Solution**:
```dockerfile
# In Dockerfile, pin wasm-bindgen-cli version
RUN cargo install wasm-bindgen-cli --version 0.2.103
```

### Container Exits Immediately

**Problem**: Container starts then exits

**Solution**: Check logs and verify:
```bash
docker logs sexy-pivoine-frontend

# Verify build output exists
docker run -it --rm sexy.pivoine.art:latest ls -la packages/frontend/build
```

### Port Already in Use

**Problem**: Port 3000 already bound

**Solution**:
```bash
# Use different host port
docker run -d -p 8080:3000 sexy.pivoine.art:latest
```

## Maintenance

### Clean Up

```bash
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune -a

# Remove build cache
docker builder prune

# Complete cleanup (use with caution)
docker system prune -a --volumes
```

### Update Base Image

Regularly update the base Node.js image:

```bash
# Pull latest Node 20 LTS
docker pull node:20.19.1-slim

# Rebuild
docker build --pull -t sexy.pivoine.art:latest .
```
