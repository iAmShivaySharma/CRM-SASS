# Use Node.js 18 Alpine as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Set Node.js memory limit
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm install

# Copy application code
COPY . .

# Set build-time environment variables to prevent MongoDB connection during build
ENV MONGODB_URI="mongodb://placeholder:27017/placeholder"
ENV JWT_SECRET="build-time-placeholder"
ENV CORS_ORIGINS="http://localhost:3000"
ENV N8N_BASE_URL="http://placeholder:5678"
ENV N8N_API_KEY="placeholder-key"
ENV DODO_API_KEY="placeholder-dodo-key"
ENV DODO_WEBHOOK_SECRET="placeholder-dodo-secret"
ENV NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Build the application with increased memory and production environment
RUN NODE_OPTIONS="--max-old-space-size=8192" NODE_ENV=production npm run build

# Remove dev dependencies after build to reduce image size
RUN npm prune --production && npm cache clean --force

# Set production environment
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]