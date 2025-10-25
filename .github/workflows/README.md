# GitHub Actions Workflows

This directory contains automated workflows for building, scanning, and managing Docker images for sexy.pivoine.art.

## Workflows

### 1. Build and Push Docker Image (`docker-build-push.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- New version tags (e.g., `v1.0.0`)
- Pull requests to `main`
- Manual trigger via workflow_dispatch

**What it does:**
- Builds multi-platform Docker images (AMD64 + ARM64)
- Pushes to GitHub Container Registry as `ghcr.io/valknarxxx/sexy`
- Creates tags based on branch, version, and commit SHA
- Uses build cache for faster builds
- Only builds (doesn't push) for PRs

**Image Tags:**
- `latest` - Latest build from main branch
- `main`, `develop` - Branch-based tags
- `v1.0.0`, `v1.0`, `v1` - Semantic version tags
- `main-abc123` - Branch + commit SHA
- `pr-123` - Pull request builds
- Custom tags via manual trigger

**Usage:**

```bash
# Automatically triggered on push to main
git push origin main

# Create a release tag
git tag v1.0.0
git push origin v1.0.0

# Manual trigger from GitHub UI
# Actions → Build and Push Docker Image → Run workflow
```

**Pulling images:**

```bash
# Latest version
docker pull ghcr.io/valknarxxx/sexy:latest

# Specific version
docker pull ghcr.io/valknarxxx/sexy:v1.0.0

# Specific branch
docker pull ghcr.io/valknarxxx/sexy:develop
```

### 2. Docker Image Security Scan (`docker-scan.yml`)

**Triggers:**
- Daily at 2 AM UTC (scheduled)
- Push to `main` branch
- New version tags
- Manual trigger

**What it does:**
- Scans the latest image for vulnerabilities using Trivy
- Reports CRITICAL and HIGH severity issues
- Uploads results to GitHub Security tab
- Runs on a schedule to detect new vulnerabilities

**Viewing results:**
- Go to repository → Security → Code scanning alerts
- Check workflow run summary for table output

**Manual scan:**

```bash
# From GitHub UI
# Actions → Docker Image Security Scan → Run workflow
```

### 3. Cleanup Old Docker Images (`cleanup-images.yml`)

**Triggers:**
- Weekly on Sunday at 3 AM UTC
- Manual trigger

**What it does:**
- Removes old untagged image versions
- Keeps the 10 most recent versions by default
- Frees up GitHub Container Registry storage

**Manual cleanup:**

```bash
# From GitHub UI with custom retention
# Actions → Cleanup Old Docker Images → Run workflow
# Set "keep_count" parameter (default: 10)
```

## Setup Requirements

### 1. Enable GitHub Container Registry

The workflows automatically use GitHub's Container Registry (ghcr.io). No additional setup needed - the `GITHUB_TOKEN` is automatically provided to workflows.

### 2. Repository Settings

Ensure the following permissions are enabled:

1. **Settings → Actions → General**
   - Allow GitHub Actions: ✅ Enabled
   - Workflow permissions: "Read and write permissions"

2. **Settings → Packages**
   - Package visibility will inherit from repository visibility
   - Can be changed to public/private as needed

### 3. Branch Protection (Optional)

For production use, consider:

1. **Settings → Branches → Branch protection rules**
   - Protect `main` branch
   - Require PR reviews
   - Require status checks (Docker build) to pass

## Secrets and Environment Variables

### Required Secrets

None! The workflows use the built-in `GITHUB_TOKEN` which is automatically provided.

### Optional Secrets

If you need to deploy to production automatically, you can add:

- `PRODUCTION_SSH_KEY` - For SSH deployment
- `PRODUCTION_HOST` - Production server hostname
- `PRODUCTION_USER` - Production server user

## Image Visibility

By default, GitHub Container Registry packages inherit repository visibility:

- **Public repository** → Public images
- **Private repository** → Private images

To change package visibility:

1. Go to https://github.com/users/valknarxxx/packages/container/sexy/settings
2. Change visibility under "Danger Zone"

## Pulling Images

### Public Images

```bash
docker pull ghcr.io/valknarxxx/sexy:latest
```

### Private Images

```bash
# 1. Create a GitHub Personal Access Token with read:packages scope
#    Settings → Developer settings → Personal access tokens → Tokens (classic)
#    Scopes: read:packages

# 2. Login to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# 3. Pull the image
docker pull ghcr.io/valknarxxx/sexy:latest
```

## Best Practices

### Version Tagging

Use semantic versioning for releases:

```bash
# Major release (breaking changes)
git tag v2.0.0

# Minor release (new features)
git tag v1.1.0

# Patch release (bug fixes)
git tag v1.0.1

# Always push tags
git push origin --tags
```

### Development Workflow

```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Make changes and commit
git add .
git commit -m "Add new feature"

# 3. Push and create PR
git push origin feature/new-feature
# Create PR on GitHub - this triggers a test build

# 4. Merge to develop for staging
# Merging to develop triggers a build with 'develop' tag

# 5. Merge to main for production
# Merging to main triggers a build with 'latest' tag

# 6. Tag releases
git checkout main
git pull
git tag v1.0.0
git push origin v1.0.0
# This triggers a build with version tags
```

## Monitoring

### Build Status

Check workflow status:
- Repository → Actions → Select workflow
- View logs, artifacts, and summaries

### Image Registry

View published images:
- https://github.com/valknarxxx?tab=packages
- Or repository → Packages

### Security Alerts

View vulnerability scans:
- Repository → Security → Code scanning alerts
- Filter by "Trivy" tool

## Troubleshooting

### Build Failures

**Problem:** Build fails at Rust installation

**Solution:**
- Check GitHub Actions runner status
- Verify Dockerfile Rust installation steps
- Check build logs for network issues

**Problem:** Permission denied when pushing

**Solution:**
- Verify repository Settings → Actions → General → Workflow permissions
- Ensure "Read and write permissions" is enabled

**Problem:** Multi-platform build timeout

**Solution:**
- Builds can take 30-45 minutes for multi-platform
- This is normal for Rust/WASM compilation
- Consider splitting platforms or using self-hosted runners

### Pull Failures

**Problem:** Cannot pull private image

**Solution:**
```bash
# Ensure you're logged in
echo $GITHUB_TOKEN | docker login ghcr.io -u valknarxxx --password-stdin

# Verify token has read:packages scope
```

**Problem:** Image not found

**Solution:**
- Check image exists: https://github.com/valknarxxx?tab=packages
- Verify tag name is correct
- Ensure you have access to private packages

## Advanced Configuration

### Self-Hosted Runners

For faster builds, use self-hosted runners:

```yaml
jobs:
  build-and-push:
    runs-on: self-hosted  # Change from ubuntu-latest
    # ... rest of job
```

### Build-time Variables

Pass build arguments:

```yaml
build-args: |
  NODE_ENV=production
  CUSTOM_VAR=value
```

### Deploy on Push

Add a deployment job:

```yaml
jobs:
  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to production
        # Add deployment steps
```

## Cost Optimization

### Storage Limits

GitHub provides:
- **Public repos:** Unlimited storage and bandwidth
- **Private repos:** 500MB storage, 1GB bandwidth (free tier)

### Optimization Tips

1. **Regular cleanup:** Run cleanup workflow weekly
2. **Limit platforms:** Build only needed architectures
3. **Use cache:** BuildKit cache reduces rebuild time
4. **Minimize layers:** Optimize Dockerfile

### Monitoring Usage

Check package storage:
- Settings → Billing → Packages
- View storage usage per package
