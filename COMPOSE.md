# Docker Compose Guide

This guide explains the Docker Compose setup for sexy.pivoine.art with local development and production configurations.

## Architecture Overview

The application uses a **multi-file compose setup** with two configurations:

1. **`compose.yml`** - Base configuration for local development
2. **`compose.production.yml`** - Production overrides with Traefik integration

### Service Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  🌐 Traefik Reverse Proxy (Production Only)                │
│  ├─ HTTPS Termination                                       │
│  ├─ Automatic Let's Encrypt                                 │
│  └─ Routes traffic to frontend & Directus API              │
├─────────────────────────────────────────────────────────────┤
│  💄 Frontend (SvelteKit)                                    │
│  ├─ Port 3000 (internal)                                    │
│  ├─ Serves on https://sexy.pivoine.art                     │
│  └─ Proxies /api to Directus                               │
├─────────────────────────────────────────────────────────────┤
│  🎭 Directus CMS                                            │
│  ├─ Port 8055 (internal)                                    │
│  ├─ Serves on https://sexy.pivoine.art/api                 │
│  ├─ Custom bundle extensions mounted                        │
│  └─ Uploads volume                                          │
├─────────────────────────────────────────────────────────────┤
│  🗄️ PostgreSQL (Local) / External (Production)            │
│  └─ Database for Directus                                   │
├─────────────────────────────────────────────────────────────┤
│  💾 Redis (Local) / External (Production)                  │
│  └─ Cache & session storage                                 │
└─────────────────────────────────────────────────────────────┘
```

## Local Development Setup

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+

### Quick Start

1. **Create environment file:**

```bash
cp .env.example .env
# Edit .env with your local settings (defaults work fine)
```

2. **Start all services:**

```bash
docker-compose up -d
```

3. **Access services:**
   - Frontend: http://localhost:3000 (if enabled)
   - Directus: http://localhost:8055
   - Directus Admin: http://localhost:8055/admin

4. **View logs:**

```bash
docker-compose logs -f
```

5. **Stop services:**

```bash
docker-compose down
```

### Local Services

#### PostgreSQL
- **Image:** `postgres:16-alpine`
- **Port:** 5432 (internal only)
- **Volume:** `postgres-data`
- **Database:** `sexy`

#### Redis
- **Image:** `redis:7-alpine`
- **Port:** 6379 (internal only)
- **Volume:** `redis-data`
- **Persistence:** AOF enabled

#### Directus
- **Image:** `directus/directus:11`
- **Port:** 8055 (exposed)
- **Volumes:**
  - `directus-uploads` - File uploads
  - `./packages/bundle/dist` - Custom extensions
- **Features:**
  - Auto-reload extensions
  - WebSockets enabled
  - CORS enabled for localhost

### Local Development Workflow

```bash
# Start infrastructure (Postgres, Redis, Directus)
docker-compose up -d

# Develop frontend locally with hot reload
cd packages/frontend
pnpm dev

# Build Directus bundle
pnpm --filter @sexy.pivoine.art/bundle build

# Restart Directus to load new bundle
docker-compose restart directus
```

## Production Deployment

### Prerequisites

- External PostgreSQL database
- External Redis instance
- Traefik reverse proxy configured
- External network: `compose_network`

### Setup

The production compose file now uses the `include` directive to automatically extend `compose.yml`, making deployment simpler.

1. **Create production environment file:**

```bash
cp .env.production.example .env.production
```

2. **Edit `.env.production` with your values:**

```bash
# Database (external)
CORE_DB_HOST=your-postgres-host
SEXY_DB_NAME=sexy_production
DB_USER=sexy
DB_PASSWORD=your-secure-password

# Redis (external)
CORE_REDIS_HOST=your-redis-host

# Directus
SEXY_DIRECTUS_SECRET=your-32-char-random-secret
ADMIN_PASSWORD=your-secure-admin-password

# Traefik
SEXY_TRAEFIK_HOST=sexy.pivoine.art

# Frontend
PUBLIC_API_URL=https://sexy.pivoine.art/api
PUBLIC_URL=https://sexy.pivoine.art

# Email (SMTP)
EMAIL_SMTP_HOST=smtp.your-provider.com
EMAIL_SMTP_USER=your-email@domain.com
EMAIL_SMTP_PASSWORD=your-smtp-password
```

3. **Deploy:**

```bash
# Simple deployment - compose.production.yml includes compose.yml automatically
docker-compose -f compose.production.yml --env-file .env.production up -d

# Or use the traditional multi-file approach (same result)
docker-compose -f compose.yml -f compose.production.yml --env-file .env.production up -d
```

### Production Services

#### Directus
- **Image:** `directus/directus:11` (configurable)
- **Network:** `compose_network` (external)
- **Volumes:**
  - `/var/www/sexy.pivoine.art/uploads` - Persistent uploads
  - `/var/www/sexy.pivoine.art/packages/bundle/dist` - Extensions
- **Traefik routing:**
  - Domain: `sexy.pivoine.art/api`
  - Strips `/api` prefix before forwarding
  - HTTPS with auto-certificates

#### Frontend
- **Image:** `ghcr.io/valknarxxx/sexy:latest` (from GHCR)
- **Network:** `compose_network` (external)
- **Volume:** `/var/www/sexy.pivoine.art` - Application code
- **Traefik routing:**
  - Domain: `sexy.pivoine.art`
  - HTTPS with auto-certificates

### Traefik Integration

Both services are configured with Traefik labels for automatic routing:

**Frontend:**
- HTTP → HTTPS redirect
- Routes `sexy.pivoine.art` to port 3000
- Gzip compression enabled

**Directus API:**
- HTTP → HTTPS redirect
- Routes `sexy.pivoine.art/api` to port 8055
- Strips `/api` prefix
- Gzip compression enabled

### Production Commands

```bash
# Deploy/update (simplified - uses include)
docker-compose -f compose.production.yml --env-file .env.production up -d

# View logs
docker-compose -f compose.production.yml logs -f

# Restart specific service
docker-compose -f compose.production.yml restart frontend

# Stop all services
docker-compose -f compose.production.yml down

# Update images
docker-compose -f compose.production.yml pull
docker-compose -f compose.production.yml up -d
```

## Environment Variables

### Local Development (`.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_DATABASE` | `sexy` | Database name |
| `DB_USER` | `sexy` | Database user |
| `DB_PASSWORD` | `sexy` | Database password |
| `DIRECTUS_SECRET` | - | Secret for Directus (min 32 chars) |
| `ADMIN_EMAIL` | `admin@sexy.pivoine.art` | Admin email |
| `ADMIN_PASSWORD` | `admin` | Admin password |
| `CORS_ORIGIN` | `http://localhost:3000` | CORS allowed origins |

See `.env.example` for full list.

### Production (`.env.production`)

| Variable | Description | Required |
|----------|-------------|----------|
| `CORE_DB_HOST` | External PostgreSQL host | ✅ |
| `SEXY_DB_NAME` | Database name | ✅ |
| `DB_PASSWORD` | Database password | ✅ |
| `CORE_REDIS_HOST` | External Redis host | ✅ |
| `SEXY_DIRECTUS_SECRET` | Directus secret key | ✅ |
| `SEXY_TRAEFIK_HOST` | Domain name | ✅ |
| `EMAIL_SMTP_HOST` | SMTP server | ✅ |
| `EMAIL_SMTP_PASSWORD` | SMTP password | ✅ |
| `SEXY_FRONTEND_PUBLIC_API_URL` | Frontend API URL | ✅ |
| `SEXY_FRONTEND_PUBLIC_URL` | Frontend public URL | ✅ |

See `.env.production.example` for full list.

**Note:** All frontend-specific variables are prefixed with `SEXY_FRONTEND_` for clarity.

## Volumes

### Local Development

- `postgres-data` - PostgreSQL database
- `redis-data` - Redis persistence
- `directus-uploads` - Uploaded files

### Production

- `/var/www/sexy.pivoine.art/uploads` - Directus uploads
- `/var/www/sexy.pivoine.art` - Application code (frontend)

## Networks

### Local: `sexy-network`
- Bridge network
- Internal communication only
- Directus exposed on 8055

### Production: `compose_network`
- External network (pre-existing)
- Connects to Traefik
- No exposed ports (Traefik handles routing)

## Health Checks

All services include health checks:

**PostgreSQL:**
- Command: `pg_isready`
- Interval: 10s

**Redis:**
- Command: `redis-cli ping`
- Interval: 10s

**Directus:**
- Endpoint: `/server/health`
- Interval: 30s

**Frontend:**
- HTTP GET: `localhost:3000`
- Interval: 30s

## Troubleshooting

### Local Development

**Problem:** Directus won't start

```bash
# Check logs
docker-compose logs directus

# Common issues:
# 1. Database not ready - wait for postgres to be healthy
# 2. Wrong secret - check DIRECTUS_SECRET is at least 32 chars
```

**Problem:** Can't connect to database

```bash
# Check if postgres is running
docker-compose ps postgres

# Verify health
docker-compose exec postgres pg_isready -U sexy
```

**Problem:** Extensions not loading

```bash
# Rebuild bundle
pnpm --filter @sexy.pivoine.art/bundle build

# Verify volume mount
docker-compose exec directus ls -la /directus/extensions/

# Restart Directus
docker-compose restart directus
```

### Production

**Problem:** Services not accessible via domain

```bash
# Check Traefik labels
docker inspect sexy_frontend | grep traefik

# Verify compose_network exists
docker network ls | grep compose_network

# Check Traefik is running
docker ps | grep traefik
```

**Problem:** Can't connect to external database

```bash
# Test connection from Directus container
docker-compose exec directus sh
apk add postgresql-client
psql -h $CORE_DB_HOST -U $DB_USER -d $SEXY_DB_NAME
```

**Problem:** Frontend can't reach Directus API

```bash
# Check Directus is accessible
curl https://sexy.pivoine.art/api/server/health

# Verify CORS settings
# PUBLIC_API_URL should match the public Directus URL
```

## Migration from Old Setup

If migrating from `docker-compose.production.yml`:

1. **Rename environment variables** according to `.env.production.example`
2. **Update command** to use both compose files
3. **Verify Traefik labels** match your setup
4. **Test** with `docker-compose config` to see merged configuration

```bash
# Validate configuration
docker-compose -f compose.yml -f compose.production.yml --env-file .env.production config

# Deploy
docker-compose -f compose.yml -f compose.production.yml --env-file .env.production up -d
```

## Best Practices

### Local Development
1. Use default credentials (they're fine for local)
2. Keep `EXTENSIONS_AUTO_RELOAD=true` for quick iteration
3. Run frontend via `pnpm dev` for hot reload
4. Restart Directus after bundle changes

### Production
1. Use strong passwords for database and admin
2. Set `EXTENSIONS_AUTO_RELOAD=false` for stability
3. Use GHCR images for frontend
4. Enable Gzip compression via Traefik
5. Monitor logs regularly
6. Keep backups of uploads and database

## See Also

- [DOCKER.md](DOCKER.md) - Docker image documentation
- [QUICKSTART.md](QUICKSTART.md) - Quick start guide
- [CLAUDE.md](CLAUDE.md) - Development guide
