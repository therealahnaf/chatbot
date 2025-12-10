# Development Dockerfile for frontend with hot reloading

FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package*.json pnpm-lock.yaml* ./

# Install dependencies
RUN if [ -f pnpm-lock.yaml ]; then \
      pnpm install; \
    else \
      npm install; \
    fi

# Copy all source files
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Start dev server with hot reloading
# Host 0.0.0.0 is required for Docker port mapping
CMD if [ -f pnpm-lock.yaml ]; then \
      pnpm dev --host 0.0.0.0; \
    else \
      npm run dev -- --host 0.0.0.0; \
    fi