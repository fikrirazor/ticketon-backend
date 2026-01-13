# Backend Sample - Type-Safe Node.js Express Application

A production-ready, type-safe Node.js Express application built with TypeScript, Prisma ORM, PostgreSQL, and JWT authentication.

## 🚀 Features

- **TypeScript** - Full type safety across the application
- **Express.js** - Fast, unopinionated web framework
- **Prisma ORM** - Modern database toolkit with type-safe queries
- **PostgreSQL** - Robust relational database
- **JWT Authentication** - Secure token-based authentication
- **Yup Validation** - Schema validation for environment variables and request data
- **Error Handling** - Centralized error handling middleware
- **Security** - Helmet and CORS protection
- **Hot Reload** - Development server with automatic restart

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **PostgreSQL** (v14 or higher)

## 🛠️ Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd backend_sample
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy the example environment file and update it with your configuration:

```bash
cp env.example .env
```

Edit `.env` and configure the following variables:

```env
NODE_ENV=development
PORT=8000
DATABASE_URL=postgresql://username:password@localhost:5432/database_name?schema=public
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
```

**Important:** Make sure your `JWT_SECRET` is at least 32 characters long for security.

### 4. Set up the database

Generate Prisma Client:

```bash
npm run prisma:generate
```

Run database migrations:

```bash
npm run prisma:migrate
```

When prompted, enter a name for the migration (e.g., "init").

## 🏃 Running the Application

### Development Mode

Start the development server with hot reload:

```bash
npm run dev
```

The server will start on `http://localhost:8000`

### Production Mode

Build the TypeScript code:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

## 📁 Project Structure

```
backend_sample/
├── prisma/
│   └── schema.prisma          # Prisma schema definition
├── src/
│   ├── config/
│   │   ├── database.ts        # Prisma client configuration
│   │   └── env.ts             # Environment variable validation
│   ├── controllers/
│   │   ├── auth.controller.ts # Authentication logic
│   │   └── user.controller.ts # User management logic
│   ├── middleware/
│   │   ├── auth.middleware.ts # JWT verification
│   │   ├── error.middleware.ts # Error handling
│   │   └── validation.middleware.ts # Request validation
│   ├── routes/
│   │   ├── auth.routes.ts     # Auth endpoints
│   │   ├── user.routes.ts     # User endpoints
│   │   └── index.ts           # Route aggregation
│   ├── types/
│   │   └── express.d.ts       # Express type extensions
│   ├── utils/
│   │   ├── jwt.util.ts        # JWT utilities
│   │   └── password.util.ts   # Password hashing utilities
│   ├── validations/
│   │   └── auth.validation.ts # Auth validation schemas
│   ├── app.ts                 # Express app configuration
│   └── index.ts               # Application entry point
├── .env                       # Environment variables (not in git)
├── .gitignore                 # Git ignore rules
├── env.example                # Example environment variables
├── package.json               # Project dependencies and scripts
├── tsconfig.json              # TypeScript configuration
└── README.md                  # This file
```

## 🔌 API Endpoints

### Health Check

- **GET** `/api/health` - Check server status

### Authentication

- **POST** `/api/auth/signup` - Register a new user

  ```json
  {
    "email": "user@example.com",
    "password": "SecurePass123"
  }
  ```

- **POST** `/api/auth/signin` - Sign in a user
  ```json
  {
    "email": "user@example.com",
    "password": "SecurePass123"
  }
  ```

### Users (Protected Routes)

- **GET** `/api/users/profile` - Get current user profile

  - Requires: `Authorization: Bearer <token>`

- **GET** `/api/users` - Get all users
  - Requires: `Authorization: Bearer <token>`

## 🔐 Authentication

This application uses JWT (JSON Web Tokens) for authentication. After signing in or signing up, you'll receive a token that must be included in the `Authorization` header for protected routes:

```
Authorization: Bearer <your-jwt-token>
```

## 🗄️ Database Management

### Prisma Studio

Open Prisma Studio to view and edit your database:

```bash
npm run prisma:studio
```

### Create a new migration

After modifying `prisma/schema.prisma`:

```bash
npm run prisma:migrate
```

### Push schema changes without migration

```bash
npm run prisma:push
```

## 📝 Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run production server
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio
- `npm run prisma:push` - Push schema changes to database
- `npm run lint` - Type-check without emitting files

## 🧪 Testing the API

### Using cURL

**Sign Up:**

```bash
curl -X POST http://localhost:8000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123"}'
```

**Sign In:**

```bash
curl -X POST http://localhost:8000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123"}'
```

**Get Profile (Protected):**

```bash
curl -X GET http://localhost:8000/api/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Using Postman or Thunder Client

1. Import the endpoints listed above
2. For protected routes, add the JWT token to the Authorization header
3. Set the type to "Bearer Token"

## 🔒 Security Best Practices

- ✅ Environment variables validated with Yup
- ✅ Passwords hashed with bcrypt (10 salt rounds)
- ✅ JWT tokens with configurable expiration
- ✅ Helmet.js for security headers
- ✅ CORS protection
- ✅ Input validation with Yup schemas
- ✅ Type-safe database queries with Prisma
- ✅ Error handling without exposing sensitive information

## 🐛 Troubleshooting

### Database Connection Issues

If you encounter database connection errors:

1. Ensure PostgreSQL is running
2. Verify your `DATABASE_URL` in `.env`
3. Check that the database exists
4. Ensure the user has proper permissions

### Migration Issues

If migrations fail:

```bash
# Reset the database (WARNING: This will delete all data)
npx prisma migrate reset

# Then run migrations again
npm run prisma:migrate
```

### TypeScript Errors

Run type checking:

```bash
npm run lint
```

## 📚 Tech Stack

- **Runtime:** Node.js
- **Language:** TypeScript
- **Framework:** Express.js
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Authentication:** JWT (jsonwebtoken)
- **Validation:** Yup
- **Password Hashing:** bcrypt
- **Security:** Helmet, CORS
- **Dev Tools:** ts-node-dev, nodemon

## 📄 License

ISC

## 👨‍💻 Author

Your Name

---

**Happy Coding! 🚀**
