# Quick Start Guide

Get sexy.pivoine.art running in under 5 minutes using pre-built Docker images.

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+ (optional)

## Option 1: Docker Run (Fastest)

### Step 1: Pull the Image

```bash
docker pull ghcr.io/valknarxxx/sexy:latest
```

### Step 2: Create Environment File

```bash
cat > .env.production << EOF
PUBLIC_API_URL=https://api.your-domain.com
PUBLIC_URL=https://your-domain.com
PUBLIC_UMAMI_ID=
LETTERSPACE_API_URL=
LETTERSPACE_API_KEY=
LETTERSPACE_LIST_ID=
EOF
```

### Step 3: Run the Container

```bash
docker run -d \
  --name sexy-pivoine \
  -p 3000:3000 \
  --env-file .env.production \
  --restart unless-stopped \
  ghcr.io/valknarxxx/sexy:latest
```

### Step 4: Verify

```bash
# Check if running
docker ps | grep sexy-pivoine

# Check logs
docker logs -f sexy-pivoine

# Test the application
curl http://localhost:3000
```

Your application is now running at `http://localhost:3000` 🎉

## Option 2: Docker Compose (Recommended)

### Step 1: Download docker-compose.production.yml

```bash
curl -O https://raw.githubusercontent.com/valknarxxx/sexy/main/docker-compose.production.yml
```

Or if you have the repository:

```bash
cd /path/to/sexy.pivoine.art
```

### Step 2: Create Environment File

```bash
cp .env.production.example .env.production
nano .env.production  # Edit with your values
```

### Step 3: Start Services

```bash
docker-compose -f docker-compose.production.yml up -d
```

### Step 4: Monitor

```bash
# View logs
docker-compose -f docker-compose.production.yml logs -f

# Check status
docker-compose -f docker-compose.production.yml ps
```

Your application is now running at `http://localhost:3000` 🎉

## Accessing Private Images

If the image is in a private registry:

### Step 1: Create GitHub Personal Access Token

1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scope: `read:packages`
4. Generate and copy the token

### Step 2: Login to GitHub Container Registry

```bash
echo YOUR_GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

### Step 3: Pull and Run

Now you can pull private images:

```bash
docker pull ghcr.io/valknarxxx/sexy:latest
```

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `PUBLIC_API_URL` | Directus API endpoint | `https://api.pivoine.art` |
| `PUBLIC_URL` | Frontend URL | `https://sexy.pivoine.art` |

### Optional

| Variable | Description | Example |
|----------|-------------|---------|
| `PUBLIC_UMAMI_ID` | Analytics tracking ID | `abc-123-def` |
| `LETTERSPACE_API_URL` | Newsletter API | `https://api.letterspace.com/v1` |
| `LETTERSPACE_API_KEY` | Newsletter API key | `sk_live_...` |
| `LETTERSPACE_LIST_ID` | Mailing list ID | `list_abc123` |

## Common Commands

### View Logs

```bash
# Follow logs (Docker Run)
docker logs -f sexy-pivoine

# Follow logs (Docker Compose)
docker-compose -f docker-compose.production.yml logs -f
```

### Restart Container

```bash
# Docker Run
docker restart sexy-pivoine

# Docker Compose
docker-compose -f docker-compose.production.yml restart
```

### Stop Container

```bash
# Docker Run
docker stop sexy-pivoine

# Docker Compose
docker-compose -f docker-compose.production.yml down
```

### Update to Latest Version

```bash
# Docker Run
docker pull ghcr.io/valknarxxx/sexy:latest
docker stop sexy-pivoine
docker rm sexy-pivoine
# Then re-run the docker run command from Step 3

# Docker Compose
docker-compose -f docker-compose.production.yml pull
docker-compose -f docker-compose.production.yml up -d
```

### Shell Access

```bash
# Docker Run
docker exec -it sexy-pivoine sh

# Docker Compose
docker-compose -f docker-compose.production.yml exec frontend sh
```

## Available Image Tags

| Tag | Description | Use Case |
|-----|-------------|----------|
| `latest` | Latest stable build from main | Production |
| `v1.0.0` | Specific version | Production (pinned) |
| `develop` | Latest from develop branch | Staging |
| `main-abc123` | Specific commit | Testing |

**Best Practice:** Use version tags in production for predictable deployments.

## Production Deployment

### 1. Use Version Tags

```bash
# Instead of :latest
docker pull ghcr.io/valknarxxx/sexy:v1.0.0
```

### 2. Add Resource Limits

```bash
docker run -d \
  --name sexy-pivoine \
  -p 3000:3000 \
  --env-file .env.production \
  --memory="2g" \
  --cpus="2" \
  --restart unless-stopped \
  ghcr.io/valknarxxx/sexy:v1.0.0
```

### 3. Use a Reverse Proxy

Example with nginx:

```nginx
server {
    listen 80;
    server_name sexy.pivoine.art;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4. Enable HTTPS

Use Certbot or similar:

```bash
certbot --nginx -d sexy.pivoine.art
```

## Health Check

The container includes a built-in health check:

```bash
# Check container health
docker inspect --format='{{.State.Health.Status}}' sexy-pivoine
```

Possible statuses:
- `starting` - Container just started
- `healthy` - Application is responding
- `unhealthy` - Application is not responding

## Troubleshooting

### Container Exits Immediately

```bash
# Check logs
docker logs sexy-pivoine

# Common issues:
# - Missing environment variables
# - Port 3000 already in use
# - Invalid environment variable values
```

### Cannot Pull Image

```bash
# For private images, ensure you're logged in
docker login ghcr.io

# Check if image exists
docker pull ghcr.io/valknarxxx/sexy:latest
```

### Port Already in Use

```bash
# Use a different port
docker run -d -p 8080:3000 ghcr.io/valknarxxx/sexy:latest

# Or find what's using port 3000
lsof -i :3000
```

### Application Not Accessible

```bash
# Check if container is running
docker ps | grep sexy-pivoine

# Check logs
docker logs sexy-pivoine

# Verify port mapping
docker port sexy-pivoine

# Test from inside container
docker exec sexy-pivoine wget -O- http://localhost:3000
```

## Next Steps

- **Production setup:** See [DOCKER.md](DOCKER.md)
- **Development:** See [CLAUDE.md](CLAUDE.md)
- **CI/CD:** See [.github/workflows/README.md](.github/workflows/README.md)

## Support

- **Issues:** https://github.com/valknarxxx/sexy/issues
- **Discussions:** https://github.com/valknarxxx/sexy/discussions
- **Security:** Report privately via GitHub Security tab

## License

See [LICENSE](LICENSE) file for details.
