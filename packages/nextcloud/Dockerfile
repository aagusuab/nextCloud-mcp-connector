FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.base.json ./
COPY packages/core/package.json ./packages/core/
COPY packages/nextcloud/package.json ./packages/nextcloud/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/core/src ./packages/core/src
COPY packages/core/tsconfig.json ./packages/core/
COPY packages/nextcloud/src ./packages/nextcloud/src
COPY packages/nextcloud/tsconfig.json ./packages/nextcloud/

# Build
RUN pnpm build

# Production image
FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=builder /app/packages/core/package.json ./packages/core/
COPY --from=builder /app/packages/nextcloud/package.json ./packages/nextcloud/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built files
COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/packages/nextcloud/dist ./packages/nextcloud/dist

# Set working directory to nextcloud package
WORKDIR /app/packages/nextcloud

# Expose port for SSE transport
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Default to SSE transport for Kubernetes
CMD ["node", "dist/index.js", "--transport=sse"]
