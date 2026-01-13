# 📟 Complete Terminal Commands Reference

This document contains all the terminal commands needed to set up and run the application.

## 🎯 Initial Setup (Already Completed)

The following commands have already been executed to set up the project:

```bash
# 1. Initialize npm project
npm init -y

# 2. Install production dependencies
npm install express prisma @prisma/client bcrypt jsonwebtoken yup dotenv cors helmet

# 3. Install development dependencies
npm install -D typescript @types/express @types/node @types/bcrypt @types/jsonwebtoken @types/cors ts-node-dev nodemon

# 4. Initialize Prisma with PostgreSQL
npx prisma init --datasource-provider postgresql

# 5. Generate Prisma Client
npm run prisma:generate

# 6. Initialize Git repository
git init
```

## 🚀 Getting Started (Run These Commands)

### 1. Configure Environment

```bash
# Copy environment template (if not already done)
cp env.example .env

# Edit .env with your database credentials
# Use your preferred editor: nano, vim, code, etc.
nano .env
```

Update the `.env` file with your PostgreSQL credentials:
```env
DATABASE_URL=postgresql://your_user:your_password@localhost:5432/your_database?schema=public
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long
```

### 2. Run Database Migrations

```bash
# Create and run the initial migration
npm run prisma:migrate

# When prompted, enter a migration name (e.g., "init")
```

### 3. Start Development Server

```bash
# Start the server with hot reload
npm run dev
```

The server will start at `http://localhost:8000`

## 🧪 Testing the API

### Health Check

```bash
curl http://localhost:8000/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2026-01-05T..."
}
```

### Sign Up a New User

```bash
curl -X POST http://localhost:8000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "...",
      "email": "test@example.com",
      "createdAt": "...",
      "updatedAt": "..."
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Sign In

```bash
curl -X POST http://localhost:8000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123"
  }'
```

### Get User Profile (Protected Route)

```bash
# Replace YOUR_JWT_TOKEN with the token from sign-up or sign-in response
curl -X GET http://localhost:8000/api/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get All Users (Protected Route)

```bash
curl -X GET http://localhost:8000/api/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📦 Production Build

### Build the Application

```bash
# Compile TypeScript to JavaScript
npm run build
```

This creates a `dist/` folder with compiled JavaScript files.

### Run Production Server

```bash
# Start the production server
npm start
```

## 🗄️ Database Management

### Open Prisma Studio (Database GUI)

```bash
npm run prisma:studio
```

This opens a web interface at `http://localhost:5555` to view and edit your database.

### Create a New Migration

After modifying `prisma/schema.prisma`:

```bash
npm run prisma:migrate
```

### Push Schema Changes (Without Migration)

```bash
npm run prisma:push
```

### Reset Database (⚠️ Deletes All Data)

```bash
npx prisma migrate reset
```

## 🔍 Development Tools

### Type Check

```bash
# Check TypeScript types without building
npm run lint
```

### Format Code (if you add a formatter)

```bash
# Install Prettier (optional)
npm install -D prettier

# Format all files
npx prettier --write "src/**/*.ts"
```

## 🐛 Troubleshooting Commands

### Check Node Version

```bash
node --version
# Should be v18 or higher
```

### Check PostgreSQL Status

```bash
# macOS (if using Homebrew)
brew services list | grep postgresql

# Linux
sudo systemctl status postgresql

# Check if PostgreSQL is listening
psql -U postgres -c "SELECT version();"
```

### Clear Node Modules and Reinstall

```bash
rm -rf node_modules package-lock.json
npm install
```

### Regenerate Prisma Client

```bash
npm run prisma:generate
```

## 📝 Git Commands

### Initial Commit

```bash
git add .
git commit -m "Initial commit: Type-safe Express API with TypeScript and Prisma"
```

### Create a New Branch

```bash
git checkout -b feature/your-feature-name
```

## 🔄 Common Development Workflow

```bash
# 1. Start development server
npm run dev

# 2. Make changes to code (server auto-reloads)

# 3. If you modify Prisma schema:
npm run prisma:migrate

# 4. Test your changes
curl http://localhost:8000/api/health

# 5. Type check
npm run lint

# 6. Build for production
npm run build

# 7. Commit changes
git add .
git commit -m "Your commit message"
```

---

**All commands are ready to use!** 🚀

