# Docker & CI/CD Setup Summary

This document summarizes all Docker and CI/CD files created for sexy.pivoine.art.

## Files Created

### Docker Files

1. **`Dockerfile`** (root)
   - Multi-stage build (base → builder → runner)
   - Rust toolchain installation for WASM builds
   - Optimized layer caching
   - Non-root user for security
   - Health checks included

2. **`.dockerignore`** (root)
   - Excludes unnecessary files from build context
   - Optimizes build performance

3. **`docker-compose.production.yml`** (root)
   - Production orchestration
   - Pre-configured to use GHCR images
   - Resource limits and health checks
   - Environment variable management

4. **`.env.production.example`** (root)
   - Template for all environment variables
   - Documented with examples

### Build Scripts

5. **`build.sh`** (root)
   - Convenience script for building images
   - Supports tags, platforms, and pushing
   - Executable (`chmod +x`)

### Documentation

6. **`DOCKER.md`** (root)
   - Comprehensive Docker deployment guide
   - Building, running, troubleshooting
   - Production best practices
   - Updated with GHCR information

7. **`QUICKSTART.md`** (root)
   - 5-minute quick start guide
   - Docker Run and Docker Compose examples
   - Common commands reference

8. **`README.md`** (root) - **UPDATED**
   - Added Docker quick start
   - Added CI/CD badges
   - Added documentation links

9. **`CLAUDE.md`** (root) - **UPDATED**
   - Added Docker deployment section
   - Referenced DOCKER.md

### GitHub Actions Workflows

10. **`.github/workflows/docker-build-push.yml`**
    - Builds and pushes to `ghcr.io/valknarxxx/sexy`
    - Multi-platform (AMD64 + ARM64)
    - Smart tagging (latest, semver, branch, SHA)
    - Triggers: push to main/develop, tags, PRs, manual
    - BuildKit cache for faster builds

11. **`.github/workflows/docker-scan.yml`**
    - Daily security scans with Trivy
    - Reports to GitHub Security tab
    - Scans CRITICAL and HIGH vulnerabilities
    - Triggers: schedule, push to main, tags, manual

12. **`.github/workflows/cleanup-images.yml`**
    - Weekly cleanup of old images
    - Keeps last 10 versions (configurable)
    - Deletes untagged images
    - Triggers: schedule, manual

13. **`.github/workflows/README.md`**
    - Comprehensive workflow documentation
    - Setup requirements
    - Usage examples
    - Troubleshooting guide

14. **`.github/DOCKER_SETUP.md`** (this file)
    - Summary of all Docker/CI files
    - Quick reference

## Quick Reference

### Image Registry

- **Registry:** GitHub Container Registry (GHCR)
- **Image Name:** `ghcr.io/valknarxxx/sexy`
- **Tags:**
  - `latest` - Latest from main branch
  - `v1.0.0` - Semantic versions
  - `develop` - Latest from develop branch
  - `main-abc123` - Commit-specific

### Pull & Run

```bash
# Pull latest
docker pull ghcr.io/valknarxxx/sexy:latest

# Run
docker run -d -p 3000:3000 --env-file .env.production ghcr.io/valknarxxx/sexy:latest

# Or use docker-compose
docker-compose -f docker-compose.production.yml up -d
```

### Build Locally

```bash
# Using script
./build.sh

# Manual
docker build -t sexy.pivoine.art:latest .

# Multi-platform
docker buildx build --platform linux/amd64,linux/arm64 -t sexy.pivoine.art:latest .
```

### Trigger CI/CD

```bash
# Build and push 'latest'
git push origin main

# Build and push version tags
git tag v1.0.0
git push origin v1.0.0

# PR builds (test only, doesn't push)
git push origin feature/branch
# Create PR on GitHub
```

## Key Features

### Security
- ✅ Non-root user in container
- ✅ Minimal base image (node:20.19.1-slim)
- ✅ Daily vulnerability scans
- ✅ Security reports in GitHub Security tab

### Performance
- ✅ Multi-stage builds for smaller images
- ✅ BuildKit cache for faster builds
- ✅ Production-only dependencies
- ✅ Optimized layer caching

### Reliability
- ✅ Health checks built-in
- ✅ dumb-init for proper signal handling
- ✅ Resource limits configurable
- ✅ Auto-restart on failure

### Automation
- ✅ Automatic builds on push/tag
- ✅ Multi-platform support
- ✅ Smart semantic versioning
- ✅ Weekly image cleanup

## Workflow Triggers Summary

| Workflow | Push Main | Push Develop | Tags | PR | Schedule | Manual |
|----------|-----------|--------------|------|----|----------|--------|
| Build & Push | ✅ | ✅ | ✅ | ✅ (no push) | ❌ | ✅ |
| Security Scan | ✅ | ❌ | ✅ | ❌ | Daily 2AM | ✅ |
| Cleanup | ❌ | ❌ | ❌ | ❌ | Weekly Sun 3AM | ✅ |

## Environment Variables

### Required
- `PUBLIC_API_URL` - Directus API endpoint
- `PUBLIC_URL` - Frontend URL

### Optional
- `PUBLIC_UMAMI_ID` - Analytics
- `LETTERSPACE_API_URL` - Newsletter API
- `LETTERSPACE_API_KEY` - Newsletter key
- `LETTERSPACE_LIST_ID` - Mailing list ID

See `.env.production.example` for full reference.

## Next Steps

1. **Test Local Build**
   ```bash
   ./build.sh
   docker run -d -p 3000:3000 --env-file .env.production sexy.pivoine.art:latest
   ```

2. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Add Docker and CI/CD setup"
   git push origin main
   ```

3. **Monitor First Build**
   - Go to GitHub Actions tab
   - Watch "Build and Push Docker Image" workflow
   - Wait ~30-45 minutes for multi-platform build

4. **Test GHCR Image**
   ```bash
   docker pull ghcr.io/valknarxxx/sexy:latest
   docker run -d -p 3000:3000 --env-file .env.production ghcr.io/valknarxxx/sexy:latest
   ```

5. **Create First Release**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

6. **Check Security**
   - Wait for daily scan or trigger manually
   - Check GitHub → Security → Code scanning alerts

## Support Resources

- **Docker Guide:** [DOCKER.md](../DOCKER.md)
- **Quick Start:** [QUICKSTART.md](../QUICKSTART.md)
- **Development:** [CLAUDE.md](../CLAUDE.md)
- **Workflows:** [.github/workflows/README.md](workflows/README.md)

## Troubleshooting

### Common Issues

1. **Build takes too long**
   - Multi-platform builds take 30-45 minutes (normal)
   - Consider using self-hosted runners

2. **Permission denied on push**
   - Check Settings → Actions → General → Workflow permissions
   - Enable "Read and write permissions"

3. **Image not found**
   - For private repos, login to GHCR first
   - Check package exists at github.com/valknarxxx?tab=packages

4. **Container exits immediately**
   - Check logs: `docker logs <container>`
   - Verify environment variables
   - Ensure port 3000 is not in use

See [DOCKER.md](../DOCKER.md) for detailed troubleshooting.

---

**Created:** 2025-10-25
**Last Updated:** 2025-10-25
**Status:** ✅ Ready for production
