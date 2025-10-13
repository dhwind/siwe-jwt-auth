# Use Node.js 20 Alpine image
FROM node:20-alpine

# Enable corepack for pnpm
RUN corepack enable

# Set working directory
WORKDIR /app

# Copy workspace manifests
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy API package manifest only for dependency resolution
COPY packages/api/package.json packages/api/package.json

# Pre-fetch and install only API package deps
RUN pnpm fetch && pnpm install --frozen-lockfile --filter "./packages/api"

# Copy API source
COPY packages/api ./packages/api

# Set working dir to API package
WORKDIR /app/packages/api

# Generate Prisma client and build
RUN pnpm prisma:generate

COPY packages/api/prisma ./packages/api/prisma

RUN pnpm build

# Expose port
EXPOSE 3000

# Start the application
CMD ["pnpm", "start:prod"]
