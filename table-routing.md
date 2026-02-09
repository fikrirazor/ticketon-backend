# API Routing Table - Ticketon Backend

## Overview

Base URL: `http://localhost:8000/api`

---

## Health Check

| Method | Endpoint  | Authentication | Description         |
| ------ | --------- | -------------- | ------------------- |
| GET    | `/health` | None           | Check server status |

---

## Authentication Routes (`/api/auth`)

| Method | Endpoint       | Authentication | Description         | Request Body                |
| ------ | -------------- | -------------- | ------------------- | --------------------------- |
| POST   | `/auth/signup` | None           | Register a new user | `{ email, password, name }` |
| POST   | `/auth/signin` | None           | Sign in a user      | `{ email, password }`       |

---

## User Routes (`/api/users`)

| Method | Endpoint         | Authentication | Description              | Query Params |
| ------ | ---------------- | -------------- | ------------------------ | ------------ |
| GET    | `/users/profile` | **Required**   | Get current user profile | -            |
| GET    | `/users`         | None           | Get all users            | -            |

---

## Event Routes (`/api/events`)

| Method | Endpoint                    | Authentication           | Description                        | Query Params                                      | Request Body                                                                                                                      |
| ------ | --------------------------- | ------------------------ | ---------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/events`                   | None                     | Get all events (paginated)         | `page`, `limit`, `category`, `location`, `search` | -                                                                                                                                 |
| GET    | `/events/:id`               | None                     | Get event by ID                    | -                                                 | -                                                                                                                                 |
| POST   | `/events`                   | **Required** (Organizer) | Create new event                   | -                                                 | `{ title, description, locationId?, location?, address, startDate, endDate, price, seatTotal, category, imageUrl?, isPromoted? }` |
| PUT    | `/events/:id`               | **Required** (Owner)     | Update event                       | -                                                 | `{ title?, description?, location?, startDate?, endDate?, price?, seatTotal?, seatLeft?, category?, imageUrl?, isPromoted? }`     |
| DELETE | `/events/:id`               | **Required** (Owner)     | Delete event                       | -                                                 | -                                                                                                                                 |
| GET    | `/events/:id/attendees`     | **Required** (Organizer) | Get list of attendees for an event | -                                                 | -                                                                                                                                 |
| POST   | `/events/:eventId/vouchers` | **Required** (Organizer) | Create voucher for event           | -                                                 | `{ code, discountAmount?, discountPercent?, maxUsage, startDate, endDate }`                                                       |
| GET    | `/events/:eventId/vouchers` | **Required**             | Get vouchers for event             | -                                                 | -                                                                                                                                 |

---

## Organizer Routes (`/api/organizer`)

| Method | Endpoint                             | Authentication           | Description                               | Query Params              |
| ------ | ------------------------------------ | ------------------------ | ----------------------------------------- | ------------------------- |
| GET    | `/organizer/dashboard`               | **Required** (Organizer) | Get organizer dashboard statistics        | -                         |
| GET    | `/organizer/events`                  | **Required** (Organizer) | Get events created by current organizer   | `page`, `limit`, `search` |
| GET    | `/organizer/transactions`            | **Required** (Organizer) | Get transactions for organizer's events   | `page`, `limit`, `status` |
| PUT    | `/organizer/transactions/:id/status` | **Required** (Organizer) | Update transaction status (DONE/REJECTED) | -                         |

---

## Voucher Routes (`/api/vouchers`)

| Method | Endpoint                   | Authentication       | Description              | Path Params | Request Body                                  |
| ------ | -------------------------- | -------------------- | ------------------------ | ----------- | --------------------------------------------- |
| GET    | `/vouchers/:code/validate` | None                 | Validate voucher by code | `code`      | -                                             |
| PUT    | `/vouchers/:id`            | **Required** (Owner) | Update voucher           | `id`        | `{ code?, discount?, quantity?, expiresAt? }` |
| DELETE | `/vouchers/:id`            | **Required** (Owner) | Delete voucher           | `id`        | -                                             |

---

## Transaction Routes (`/api/transactions`)

| Method | Endpoint                          | Authentication | Description                     | Query Params | Request Body                                    |
| ------ | --------------------------------- | -------------- | ------------------------------- | ------------ | ----------------------------------------------- |
| GET    | `/transactions/me`                | **Required**   | Get current user's transactions | -            | -                                               |
| GET    | `/transactions/:id`               | **Required**   | Get transaction by ID           | -            | -                                               |
| POST   | `/transactions`                   | **Required**   | Create new transaction          | -            | `{ eventId, items[], pointsUsed?, voucherId? }` |
| POST   | `/transactions/:id/payment-proof` | **Required**   | Upload payment proof            | `id`         | `{ paymentProof (file) }`                       |
| PUT    | `/transactions/:id/cancel`        | **Required**   | Cancel transaction              | `id`         | -                                               |

---

## Review Routes (`/api/reviews`)

| Method | Endpoint                           | Authentication       | Description                   | Query Params    | Request Body            |
| ------ | ---------------------------------- | -------------------- | ----------------------------- | --------------- | ----------------------- |
| GET    | `/reviews/events/:eventId`         | None                 | Get reviews for event         | `page`, `limit` | -                       |
| GET    | `/reviews/organizers/:organizerId` | None                 | Get reviews for organizer     | `page`, `limit` | -                       |
| POST   | `/reviews/events/:eventId`         | **Required**         | Create review for event       | -               | `{ rating, comment }`   |
| GET    | `/reviews/me/eligible`             | **Required**         | Get eligible reviews for user | -               | -                       |
| PUT    | `/reviews/:id`                     | **Required** (Owner) | Update review                 | `id`            | `{ rating?, comment? }` |
| DELETE | `/reviews/:id`                     | **Required** (Owner) | Delete review                 | `id`            | -                       |

---

## Authentication Notes

- **None**: Public endpoint, no authentication required
- **Required**: JWT token required in Authorization header (`Authorization: Bearer <token>`)
- **Required (Organizer)**: JWT token required + user must have ORGANIZER role
- **Required (Owner)**: JWT token required + user must be the resource owner

---

## Common Response Format

```json
{
  "success": true/false,
  "message": "string",
  "data": {},
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

---

## Error Response Format

```json
{
  "success": false,
  "message": "Error message",
  "errors": ["Field error 1", "Field error 2"]
}
```

---

## File Upload Endpoints

- **`POST /events`**: Accepts `image` file (multipart/form-data)
- **`POST /transactions/:id/payment-proof`**: Accepts `paymentProof` file (multipart/form-data)
