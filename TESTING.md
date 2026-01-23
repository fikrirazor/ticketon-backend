# API Testing Guide

## 🚀 Quick Start

### Prerequisites

- Server running on `http://localhost:8000`
- Postman, Hoppscotch, or REST Client extension for VS Code

### Import Collection

**Postman:**

1. Open Postman
2. Click **Import** → Choose `postman-collection.json`
3. Collection will appear in sidebar

**Hoppscotch:**

1. Go to https://hoppscotch.io
2. Import/Export → Import from Postman
3. Upload `postman-collection.json`

**VS Code REST Client:**

1. Install "REST Client" extension
2. Open `test-api.http`
3. Click "Send Request" above each request

---

## 🔐 Authentication Flow

### 1. Register User

```http
POST http://localhost:8000/api/auth/signup
Content-Type: application/json

{
  "name": "Test Organizer",
  "email": "organizer@test.com",
  "password": "Password123",
  "confirmPassword": "Password123"
}
```

**Password Requirements:**

- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number

### 2. Change Role to ORGANIZER

After registration, update user role in database:

```bash
npm run prisma:studio
```

- Open `User` table
- Find your user
- Change `role` from `CUSTOMER` to `ORGANIZER`
- Save

### 3. Login

```http
POST http://localhost:8000/api/auth/signin
Content-Type: application/json

{
  "email": "organizer@test.com",
  "password": "Password123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Sign in successful",
  "data": {
    "user": { ... },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 4. Set Token

**Postman/Hoppscotch:**

- Copy token from login response
- Set as collection variable `token`

**REST Client (.http file):**

- Update line 3: `@token = YOUR_ACTUAL_TOKEN`

---

## 📋 API Endpoints

### Public Endpoints (No Auth Required)

#### Get All Events

```http
GET http://localhost:8000/api/events
```

#### Filter by Category

```http
GET http://localhost:8000/api/events?category=Music
```

#### Filter by Location

```http
GET http://localhost:8000/api/events?location=Jakarta
```

#### Search Events

```http
GET http://localhost:8000/api/events?search=concert
```

#### Pagination

```http
GET http://localhost:8000/api/events?page=1&limit=10
```

#### Combined Filters

```http
GET http://localhost:8000/api/events?category=Music&location=Jakarta&search=rock&page=1&limit=5
```

#### Get Event by ID

```http
GET http://localhost:8000/api/events/{eventId}
```

---

### Protected Endpoints (Auth Required)

#### Create Event (ORGANIZER only)

```http
POST http://localhost:8000/api/events
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Rock Concert 2026",
  "description": "Amazing rock concert featuring top bands",
  "location": "Jakarta Convention Center",
  "startDate": "2026-03-15T19:00:00Z",
  "endDate": "2026-03-15T23:00:00Z",
  "price": 500000,
  "seatTotal": 1000,
  "category": "Music",
  "imageUrl": "https://example.com/concert.jpg",
  "isPromoted": true
}
```

#### Update Event (Owner only)

```http
PUT http://localhost:8000/api/events/{eventId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Updated Rock Concert 2026",
  "price": 450000
}
```

#### Delete Event (Owner only)

```http
DELETE http://localhost:8000/api/events/{eventId}
Authorization: Bearer {token}
```

---

## ✅ Testing Checklist

### Basic Flow

- [ ] Register user
- [ ] Change role to ORGANIZER in database
- [ ] Login and get token
- [ ] Create event
- [ ] Get all events
- [ ] Get event by ID
- [ ] Update event
- [ ] Delete event

### Filtering & Search

- [ ] Filter by category
- [ ] Filter by location
- [ ] Search by keyword
- [ ] Test pagination
- [ ] Combined filters

### Error Cases

- [ ] Create event without token (401 Unauthorized)
- [ ] Create event as CUSTOMER (403 Forbidden)
- [ ] Update someone else's event (403 Forbidden)
- [ ] Invalid data validation (400 Bad Request)
- [ ] Get non-existent event (404 Not Found)

---

## 📊 Expected Responses

### Success Response

```json
{
  "success": true,
  "message": "Events retrieved successfully",
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": ["Title is required"]
}
```

---

## 🛠️ Troubleshooting

### Server not running

```bash
npm run dev
```

### Database not synced

```bash
npm run prisma:push
```

### Token expired

- Login again to get new token
- Update token in collection/file

### 403 Forbidden on create event

- Check user role is `ORGANIZER` in database
- Use Prisma Studio: `npm run prisma:studio`

---

## 📝 Notes

- Server runs on port **8000** (not 3000)
- All dates should be in ISO 8601 format
- Price is in IDR (Indonesian Rupiah)
- `seatLeft` is automatically set to `seatTotal` on creation
- Events are ordered by `createdAt` DESC (newest first)

## 📦 Voucher Management (Protected Endpoints)

### Create Voucher (Organizer only)

POST {{baseUrl}}/events/EVENT_ID_HERE/vouchers
Authorization: Bearer {{token}}
Content-Type: application/json

{
"code": "DISCOUNT2026",
"discountPercent": 10,
"maxUsage": 100,
"startDate": "2026-01-01T00:00:00Z",
"endDate": "2026-12-31T23:59:59Z"
}

### Get Vouchers for Event

GET {{baseUrl}}/events/EVENT_ID_HERE/vouchers
Authorization: Bearer {{token}}

### Validate Voucher (Public)

GET {{baseUrl}}/vouchers/DISCOUNT2026/validate

### Update Voucher (Organizer only)

PUT {{baseUrl}}/vouchers/VOUCHER_ID_HERE
Authorization: Bearer {{token}}
Content-Type: application/json

{
"maxUsage": 200,
"endDate": "2026-12-31T23:59:59Z"
}

### Delete Voucher (Organizer only)

DELETE {{baseUrl}}/vouchers/VOUCHER_ID_HERE
Authorization: Bearer {{token}}
