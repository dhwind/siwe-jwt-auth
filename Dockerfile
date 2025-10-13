# Use Node.js 20 Alpine image
FROM node:20-alpine

# Enable corepack for pnpm
RUN corepack enable

# Set working directory
WORKDIR /app

# Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate prisma client
RUN pnpm prisma:generate

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# Expose port
EXPOSE 3000

# Start the application
CMD ["pnpm", "start:prod"]
