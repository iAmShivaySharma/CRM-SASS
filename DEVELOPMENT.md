# Development Setup Guide

## Local Development Options

### Option 1: Local Development with Local MongoDB

**Prerequisites:**
- Node.js 18+
- MongoDB running locally on port 27017
- npm or yarn

**Setup:**
1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy development environment:
   ```bash
   cp .env.development .env.local
   ```

3. Make sure MongoDB is running locally:
   ```bash
   # On macOS with Homebrew
   brew services start mongodb/brew/mongodb-community

   # On Ubuntu/Debian
   sudo systemctl start mongod

   # On Windows
   net start MongoDB
   ```

4. Start development server:
   ```bash
   npm run dev:local
   # or simply
   npm run dev
   ```

5. Visit: `http://localhost:3000`

### Option 2: Docker Development Environment

**Prerequisites:**
- Docker and Docker Compose

**Setup:**
1. Start development environment with Docker:
   ```bash
   npm run dev:docker
   # or
   docker-compose -f docker-compose.dev.yml up --build
   ```

2. This will start:
   - **App**: `http://localhost:3000` (with hot reload)
   - **MongoDB**: `localhost:27017`
   - **MongoDB Admin**: `http://localhost:8081`

3. The development container has volume mounting for hot reload

### Option 3: Production Docker Environment

**For testing production build:**
```bash
docker-compose up --build
```

## Environment Files

- `.env.development` - Local development with localhost MongoDB
- `.env.production` - Production environment (Docker build placeholders)
- `.env` - Your current environment (can override any values)

## Database Connection Options

### Local MongoDB (Development)
```
MONGODB_URI=mongodb://localhost:27017/crm_database
```

### Docker MongoDB (Development)
```
MONGODB_URI=mongodb://admin:password123@mongodb-dev:27017/crm_database?authSource=admin
```

### Production MongoDB
```
MONGODB_URI=mongodb://admin:password123@mongodb:27017/crm_database?authSource=admin
```

## Quick Commands

```bash
# Local development
npm run dev:local

# Docker development
npm run dev:docker

# Production build test
docker-compose up --build

# Database seeding
npm run db:seed

# Type checking
npm run type-check

# Linting
npm run lint
```

## Tips for Development

1. **Use `.env.local`** for your personal development overrides
2. **Never commit** real API keys or production credentials
3. **Use development placeholders** for external APIs during development
4. **Hot reload** works in both local and Docker development modes