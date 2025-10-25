# syntax=docker/dockerfile:1

# ============================================================================
# Base stage - shared dependencies
# ============================================================================
FROM node:22.11.0-slim AS base

# Enable corepack for pnpm
RUN npm install -g corepack@latest && corepack enable

# Set working directory
WORKDIR /app

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy .env to .env.production for proper svelte compiling
RUN mkdir -p ./packages/frontend
COPY packages/frontend/.env ./packages/frontend/.env.production

# ============================================================================
# Builder stage - compile application with Rust/WASM support
# ============================================================================
FROM base AS builder

# Install build dependencies for Rust and native modules
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    pkg-config \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Rust toolchain
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y \
    --default-toolchain stable \
    --profile minimal \
    --target wasm32-unknown-unknown

# Add Rust to PATH
ENV PATH="/root/.cargo/bin:${PATH}"

# Install wasm-bindgen-cli
RUN cargo install wasm-bindgen-cli

# Copy source files
COPY packages ./packages

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Build packages in correct order with WASM support
# 1. Build buttplug WASM
RUN RUSTFLAGS='--cfg getrandom_backend="wasm_js" --cfg=web_sys_unstable_apis' \
    pnpm --filter @sexy.pivoine.art/buttplug build:wasm

# 2. Build buttplug TypeScript
RUN pnpm --filter @sexy.pivoine.art/buttplug build

# 3. Build frontend
RUN pnpm --filter @sexy.pivoine.art/frontend build

# 4. Build Directus bundle
RUN pnpm --filter @sexy.pivoine.art/bundle build

# Prune dev dependencies for production
RUN pnpm prune --prod

# ============================================================================
# Runner stage - minimal production image
# ============================================================================
FROM node:22.11.0-slim AS runner

# Install dumb-init for proper signal handling
RUN apt-get update && apt-get install -y \
    dumb-init \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN userdel -r node && \
    groupadd -r -g 1000 node && \
    useradd -r -u 1000 -g node -m -d /home/node -s /bin/bash node

# Set working directory
WORKDIR /home/node/app

# Copy production dependencies and built artifacts from builder
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder --chown=node:node /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

# Create package directories
RUN mkdir -p packages/frontend packages/bundle packages/buttplug

# Copy frontend artifacts
COPY --from=builder --chown=node:node /app/packages/frontend/build ./packages/frontend/build
COPY --from=builder --chown=node:node /app/packages/frontend/node_modules ./packages/frontend/node_modules
COPY --from=builder --chown=node:node /app/packages/frontend/package.json ./packages/frontend/package.json

# Copy bundle artifacts
COPY --from=builder --chown=node:node /app/packages/bundle/dist ./packages/bundle/dist
COPY --from=builder --chown=node:node /app/packages/bundle/node_modules ./packages/bundle/node_modules
COPY --from=builder --chown=node:node /app/packages/bundle/package.json ./packages/bundle/package.json

# Copy buttplug artifacts
COPY --from=builder --chown=node:node /app/packages/buttplug/dist ./packages/buttplug/dist
COPY --from=builder --chown=node:node /app/packages/buttplug/node_modules ./packages/buttplug/node_modules
COPY --from=builder --chown=node:node /app/packages/buttplug/package.json ./packages/buttplug/package.json

# Switch to non-root user
USER node

# Environment variables (with defaults, override at runtime)
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

# Runtime environment variables (will be passed at container start)
ENV PUBLIC_API_URL="" \
    PUBLIC_URL="" \
    PUBLIC_UMAMI_ID="" \
    LETTERSPACE_API_URL="" \
    LETTERSPACE_API_KEY="" \
    LETTERSPACE_LIST_ID=""

# Expose application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "packages/frontend/build/index.js"]
