# Development Dockerfile for frontend with hot reloading

FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all source files
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Start dev server with hot reloading
# Host 0.0.0.0 is required for Docker port mapping
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]