# sexy.pivoine.art

An adult content platform built with SvelteKit, Directus CMS, and hardware integration via Buttplug.io.

[![Build and Push Docker Image](https://github.com/valknarxxx/sexy/actions/workflows/docker-build-push.yml/badge.svg)](https://github.com/valknarxxx/sexy/actions/workflows/docker-build-push.yml)
[![Docker Image Security Scan](https://github.com/valknarxxx/sexy/actions/workflows/docker-scan.yml/badge.svg)](https://github.com/valknarxxx/sexy/actions/workflows/docker-scan.yml)

## Quick Start

### Using Docker (Recommended)

```bash
# Pull and run the latest image
docker pull ghcr.io/valknarxxx/sexy:latest
docker run -d -p 3000:3000 \
  -e PUBLIC_API_URL=https://api.your-domain.com \
  -e PUBLIC_URL=https://your-domain.com \
  ghcr.io/valknarxxx/sexy:latest
```

See [QUICKSTART.md](QUICKSTART.md) for detailed instructions.

### Local Development

**Prerequisites:**

1. Install Node.js 20.19.1
2. Enable corepack: `corepack enable`
3. Install dependencies: `pnpm install`
4. Install Rust and wasm-bindgen: `cargo install wasm-bindgen-cli`

**Start development environment:**

```bash
# Start all services (Docker Compose + frontend)
pnpm dev

# Or start individually
pnpm dev:data      # Start data services
pnpm dev:directus  # Start Directus CMS
pnpm --filter @sexy.pivoine.art/frontend dev  # Start frontend
```

Access the application at `http://localhost:3000`

## Project Structure

This is a pnpm monorepo with three packages:

- **`packages/frontend`** - SvelteKit application with Tailwind CSS 4
- **`packages/bundle`** - Directus extensions (endpoints, hooks, themes)
- **`packages/buttplug`** - Hardware control library (TypeScript + Rust/WASM)

## Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Get running in 5 minutes with Docker
- **[DOCKER.md](DOCKER.md)** - Comprehensive Docker deployment guide
- **[CLAUDE.md](CLAUDE.md)** - Development guide and architecture
- **[.github/workflows/README.md](.github/workflows/README.md)** - CI/CD workflows

## Building

### Build All Packages

```bash
pnpm install
pnpm --filter @sexy.pivoine.art/buttplug build:wasm
pnpm --filter @sexy.pivoine.art/buttplug build
pnpm --filter @sexy.pivoine.art/frontend build
pnpm --filter @sexy.pivoine.art/bundle build
```

### Build Docker Image

```bash
# Using the build script
./build.sh

# Or manually
docker build -t sexy.pivoine.art:latest .

# Multi-platform
docker buildx build --platform linux/amd64,linux/arm64 -t sexy.pivoine.art:latest .
```

## Deployment

### Production with Docker

```bash
# Using docker-compose
cp .env.production.example .env.production
# Edit .env.production with your values
docker-compose -f docker-compose.production.yml up -d
```

### Production without Docker

```bash
# Build all packages
pnpm build:frontend

# Start the server
pnpm --filter @sexy.pivoine.art/frontend start
```

## Features

- 🎨 Modern SvelteKit frontend with Tailwind CSS 4
- 🗄️ Headless CMS powered by Directus
- 🎮 Hardware integration via Buttplug.io
- 🌐 Multi-platform support (AMD64/ARM64)
- 🔒 Session-based authentication
- 📱 Responsive design with bits-ui components
- 🌍 Internationalization support (i18n)
- 📊 Built-in analytics integration (Umami)
- 📧 Newsletter integration (Letterspace)

## Technology Stack

### Frontend
- **Framework:** SvelteKit 2
- **Styling:** Tailwind CSS 4
- **UI Components:** bits-ui, custom component library
- **Build Tool:** Vite
- **Deployment:** Node.js adapter

### Backend
- **CMS:** Directus (headless)
- **Extensions:** Custom endpoints, hooks, and themes
- **Database:** PostgreSQL (via Directus)

### Hardware
- **Library:** Buttplug.io
- **Languages:** TypeScript + Rust (compiled to WASM)
- **Protocols:** WebBluetooth API

### DevOps
- **Containerization:** Docker + Docker Compose
- **CI/CD:** GitHub Actions
- **Registry:** GitHub Container Registry (GHCR)
- **Security:** Trivy vulnerability scanning

## Environment Variables

### Required

- `PUBLIC_API_URL` - Directus API endpoint
- `PUBLIC_URL` - Frontend application URL

### Optional

- `PUBLIC_UMAMI_ID` - Umami analytics tracking ID
- `LETTERSPACE_API_URL` - Newsletter API endpoint
- `LETTERSPACE_API_KEY` - Newsletter API key
- `LETTERSPACE_LIST_ID` - Mailing list identifier

See [.env.production.example](.env.production.example) for full reference.

## Development Workflow

1. Make changes to code
2. Test locally with `pnpm dev`
3. Create a feature branch
4. Push and create PR (triggers CI build)
5. Merge to `main` (triggers production build)
6. Tag release: `git tag v1.0.0 && git push origin v1.0.0`

## CI/CD Pipeline

Automated workflows handle:

- ✅ Multi-platform Docker builds (AMD64 + ARM64)
- ✅ Automated publishing to GHCR
- ✅ Daily security vulnerability scans
- ✅ Weekly cleanup of old images
- ✅ Semantic versioning from git tags

Images are available at: `ghcr.io/valknarxxx/sexy`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Ensure tests pass (when implemented)
5. Submit a pull request

## Security

- Docker images are scanned daily for vulnerabilities
- Security reports available in GitHub Security tab
- Report security issues privately via GitHub Security

## License

See [LICENSE](LICENSE) file for details.

## Support

- **Issues:** [GitHub Issues](https://github.com/valknarxxx/sexy/issues)
- **Discussions:** [GitHub Discussions](https://github.com/valknarxxx/sexy/discussions)

## Acknowledgments

- Built with [SvelteKit](https://kit.svelte.dev/)
- Powered by [Directus](https://directus.io/)
- Hardware control via [Buttplug.io](https://buttplug.io/)
- UI components from [bits-ui](https://www.bits-ui.com/)

---

**Note:** This is an adult content platform. Users must be 18+ or the age of majority in their jurisdiction.
