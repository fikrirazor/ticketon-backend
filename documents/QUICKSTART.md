# 🚀 Quick Start Guide

This guide will help you get the application up and running in minutes.

## Prerequisites

- Node.js (v18+)
- PostgreSQL (v14+)
- npm or yarn

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp env.example .env
```

Edit `.env` with your database credentials:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/backend_sample?schema=public
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long
```

### 3. Set Up Database

Generate Prisma Client:

```bash
npm run prisma:generate
```

Run database migrations:

```bash
npm run prisma:migrate
```

Enter a migration name when prompted (e.g., "init").

### 4. Start the Server

```bash
npm run dev
```

The server will start at `http://localhost:8000`

## 🧪 Test the API

### 1. Health Check

```bash
curl http://localhost:8000/api/health
```

### 2. Sign Up

```bash
curl -X POST http://localhost:8000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123"}'
```

Save the token from the response.

### 3. Get Profile (Protected Route)

```bash
curl -X GET http://localhost:8000/api/users/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 📝 Common Commands

```bash
# Development
npm run dev              # Start dev server with hot reload

# Production
npm run build            # Build for production
npm start                # Run production server

# Database
npm run prisma:studio    # Open Prisma Studio (GUI)
npm run prisma:migrate   # Create and run migrations
npm run prisma:push      # Push schema changes (no migration)

# Type Checking
npm run lint             # Check TypeScript types
```

## 🎉 You're All Set!

Your type-safe Express API is now running. Check the main README.md for detailed documentation.

