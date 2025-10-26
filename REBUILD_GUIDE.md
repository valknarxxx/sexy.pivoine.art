# 🔄 Rebuild Guide - When You Need to Rebuild the Image

## Why Rebuild?

SvelteKit's `PUBLIC_*` environment variables are **baked into the JavaScript** at build time. You need to rebuild when:

1. ✅ Changing `PUBLIC_API_URL`
2. ✅ Changing `PUBLIC_URL`
3. ✅ Changing `PUBLIC_UMAMI_ID`
4. ✅ Changing any `LETTERSPACE_*` variables
5. ❌ NOT needed for Directus env vars (those are runtime)

## Quick Rebuild Process

### 1. Update Frontend Environment Variables

Edit the frontend `.env` file:

```bash
nano packages/frontend/.env
```

Set your production values:
```bash
PUBLIC_API_URL=https://sexy.pivoine.art/api
PUBLIC_URL=https://sexy.pivoine.art
PUBLIC_UMAMI_ID=your-umami-id
LETTERSPACE_API_URL=https://api.letterspace.com/v1
LETTERSPACE_API_KEY=your-key
LETTERSPACE_LIST_ID=your-list-id
```

### 2. Rebuild the Image

```bash
# From the project root
docker build -t ghcr.io/valknarxxx/sexy:latest -t sexy.pivoine.art:latest .
```

**Expected Time:** 30-45 minutes (first build), 10-15 minutes (cached rebuild)

### 3. Restart Services

```bash
# If using docker-compose
cd /home/valknar/Projects/docker-compose/sexy
docker compose down
docker compose up -d

# Or directly
docker stop sexy_frontend
docker rm sexy_frontend
docker compose up -d frontend
```

## Monitoring the Build

### Check Build Progress

```bash
# Watch build output
docker build -t ghcr.io/valknarxxx/sexy:latest .

# Build stages:
# 1. Base (~30s) - Node.js setup
# 2. Builder (~25-40min) - Rust + WASM + packages
#    - Rust installation: ~2-3 min
#    - wasm-bindgen-cli: ~10-15 min
#    - WASM build: ~5-10 min
#    - Package builds: ~5-10 min
# 3. Runner (~2min) - Final image assembly
```

### Verify Environment Variables in Built Image

```bash
# Check what PUBLIC_API_URL is baked in
docker run --rm ghcr.io/valknarxxx/sexy:latest sh -c \
  "grep -r 'PUBLIC_API_URL' /home/node/app/packages/frontend/build/ | head -3"

# Should show: https://sexy.pivoine.art/api
```

## Push to GitHub Container Registry

After successful build:

```bash
# Login to GHCR (first time only)
echo $GITHUB_TOKEN | docker login ghcr.io -u valknarxxx --password-stdin

# Push the image
docker push ghcr.io/valknarxxx/sexy:latest
```

## Alternative: Build Arguments (Future Enhancement)

To avoid rebuilding for every env change, consider adding build arguments:

```dockerfile
# In Dockerfile, before building frontend:
ARG PUBLIC_API_URL=https://sexy.pivoine.art/api
ARG PUBLIC_URL=https://sexy.pivoine.art
ARG PUBLIC_UMAMI_ID=

# Create .env.production dynamically
RUN echo "PUBLIC_API_URL=${PUBLIC_API_URL}" > packages/frontend/.env.production && \
    echo "PUBLIC_URL=${PUBLIC_URL}" >> packages/frontend/.env.production && \
    echo "PUBLIC_UMAMI_ID=${PUBLIC_UMAMI_ID}" >> packages/frontend/.env.production
```

Then build with:
```bash
docker build \
  --build-arg PUBLIC_API_URL=https://sexy.pivoine.art/api \
  --build-arg PUBLIC_URL=https://sexy.pivoine.art \
  -t ghcr.io/valknarxxx/sexy:latest .
```

## Troubleshooting

### Build Fails at Rust Installation

```bash
# Check network connectivity
ping -c 3 sh.rustup.rs

# Build with verbose output
docker build --progress=plain -t ghcr.io/valknarxxx/sexy:latest .
```

### Build Fails at WASM

```bash
# Check if wasm-bindgen-cli matches package.json version
docker run --rm rust:latest cargo install wasm-bindgen-cli --version 0.2.103
```

### Frontend Still Shows Wrong URL

```bash
# Verify .env file is correct
cat packages/frontend/.env

# Check if old image is cached
docker images | grep sexy
docker rmi ghcr.io/valknarxxx/sexy:old-tag

# Force rebuild without cache
docker build --no-cache -t ghcr.io/valknarxxx/sexy:latest .
```

### Container Starts But Can't Connect to API

1. Check Traefik routing:
```bash
docker logs traefik | grep sexy
```

2. Check if Directus is accessible:
```bash
curl -I https://sexy.pivoine.art/api/server/health
```

3. Check frontend logs:
```bash
docker logs sexy_frontend
```

## Development vs Production

### Development (Local)
- Use `pnpm dev` for hot reload
- No rebuild needed for code changes
- Env vars from `.env` or shell

### Production (Docker)
- Rebuild required for PUBLIC_* changes
- Changes baked into JavaScript
- Env vars from `packages/frontend/.env`

## Optimization Tips

### Speed Up Rebuilds

1. **Use BuildKit cache:**
```bash
export DOCKER_BUILDKIT=1
docker build --build-arg BUILDKIT_INLINE_CACHE=1 -t ghcr.io/valknarxxx/sexy:latest .
```

2. **Multi-stage caching:**
- Dockerfile already optimized with multi-stage build
- Dependencies cached separately from code

3. **Parallel builds:**
```bash
# Build with more CPU cores
docker build --cpus 4 -t ghcr.io/valknarxxx/sexy:latest .
```

### Reduce Image Size

Current optimizations:
- ✅ Multi-stage build
- ✅ Production dependencies only
- ✅ Minimal base image
- ✅ No dev tools in final image

Expected sizes:
- Base: ~100MB
- Builder: ~2-3GB (not shipped)
- Runner: ~300-500MB (final)

## Automation

### GitHub Actions (Already Set Up)

The `.github/workflows/docker-build-push.yml` automatically:
1. Builds on push to main
2. Creates version tags
3. Pushes to GHCR
4. Caches layers for faster builds

**Trigger a rebuild:**
```bash
git tag v1.0.1
git push origin v1.0.1
```

### Local Build Script

Use the provided `build.sh`:
```bash
./build.sh -t v1.0.0 -p
```

## When NOT to Rebuild

You DON'T need to rebuild for:
- ❌ Directus configuration changes
- ❌ Database credentials
- ❌ Redis settings
- ❌ SMTP settings
- ❌ Session cookie settings
- ❌ Traefik labels

These are runtime environment variables and can be changed in docker-compose.

## Summary

| Change | Rebuild Needed | How to Apply |
|--------|----------------|--------------|
| `PUBLIC_API_URL` | ✅ Yes | Rebuild image |
| `PUBLIC_URL` | ✅ Yes | Rebuild image |
| `PUBLIC_UMAMI_ID` | ✅ Yes | Rebuild image |
| `LETTERSPACE_*` | ✅ Yes | Rebuild image |
| `SEXY_DIRECTUS_*` | ❌ No | Restart container |
| `DB_*` | ❌ No | Restart container |
| `EMAIL_*` | ❌ No | Restart container |
| Traefik labels | ❌ No | Restart container |

---

**Remember:** The key difference is **build-time** (compiled into JS) vs **runtime** (read from environment).
