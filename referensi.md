# Backend API Reference for Frontend Integration - Feature 1

## Overview
This document serves as a comprehensive reference for frontend developers to integrate with the backend API for the Ticketon Event Management Platform. It includes routing information, validation schemas, controller functions, and database schema details for Feature 1 (Event, Transaction, Review).

## Base URL
```
http://localhost:8000/api
```

---

## Authentication

### Sign Up
- **Method:** POST
- **Endpoint:** `/auth/signup`
- **Authentication:** None
- **Description:** Register a new user

#### Request Body Validation Schema
```typescript
{
  name: yup.string().required("Name is required").min(2, "Name must be at least 2 characters"),
  email: yup.string().required("Email is required").email("Email must be valid"),
  password: yup.string().required("Password is required").min(6, "Password must be at least 6 characters"),
  role: yup.string().oneOf(["CUSTOMER", "ORGANIZER"]).default("CUSTOMER")
}
```

#### Example Request
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "CUSTOMER"
}
```

#### Example Response
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "string",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "CUSTOMER",
      "referralCode": "string",
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    },
    "token": "JWT_TOKEN"
  }
}
```

---

### Sign In
- **Method:** POST
- **Endpoint:** `/auth/signin`
- **Authentication:** None
- **Description:** Authenticate user and return JWT token

#### Request Body Validation Schema
```typescript
{
  email: yup.string().required("Email is required").email("Email must be valid"),
  password: yup.string().required("Password is required").min(6, "Password must be at least 6 characters")
}
```

#### Example Request
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Example Response
```json
{
  "success": true,
  "message": "Sign in successful",
  "data": {
    "user": {
      "id": "string",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "CUSTOMER",
      "referralCode": "string",
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    },
    "token": "JWT_TOKEN"
  }
}
```

---

## Events

### Get All Events
- **Method:** GET
- **Endpoint:** `/events`
- **Authentication:** None
- **Description:** Retrieve paginated list of events with filtering options

#### Query Parameters Validation Schema
```typescript
{
  category: yup.string(),
  location: yup.string(),
  search: yup.string(),
  page: yup.number().min(1).default(1),
  limit: yup.number().min(1).default(10)
}
```

#### Example Request
```
GET /events?page=1&limit=10&category=music&location=jakarta&search=festival
```

#### Example Response
```json
{
  "success": true,
  "message": "Events retrieved successfully",
  "data": {
    "events": [
      {
        "id": "string",
        "title": "Festival Title",
        "description": "Event description",
        "location": "Event location",
        "startDate": "2023-12-01T10:00:00.000Z",
        "endDate": "2023-12-02T10:00:00.000Z",
        "price": 100000,
        "seatTotal": 500,
        "seatLeft": 450,
        "category": "music",
        "imageUrl": "path/to/image.jpg",
        "isPromoted": false,
        "organizerId": "string",
        "createdAt": "2023-11-01T10:00:00.000Z",
        "updatedAt": "2023-11-01T10:00:00.000Z",
        "organizer": {
          "id": "string",
          "name": "Organizer Name",
          "email": "organizer@example.com"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10
    }
  }
}
```

---

### Get Event by ID
- **Method:** GET
- **Endpoint:** `/events/:id`
- **Authentication:** None
- **Description:** Retrieve a specific event by ID

#### Example Request
```
GET /events/12345678-1234-1234-1234-123456789012
```

#### Example Response
```json
{
  "success": true,
  "message": "Event retrieved successfully",
  "data": {
    "id": "string",
    "title": "Festival Title",
    "description": "Event description",
    "location": "Event location",
    "startDate": "2023-12-01T10:00:00.000Z",
    "endDate": "2023-12-02T10:00:00.000Z",
    "price": 100000,
    "seatTotal": 500,
    "seatLeft": 450,
    "category": "music",
    "imageUrl": "path/to/image.jpg",
    "isPromoted": false,
    "organizerId": "string",
    "createdAt": "2023-11-01T10:00:00.000Z",
    "updatedAt": "2023-11-01T10:00:00.000Z",
    "organizer": {
      "id": "string",
      "name": "Organizer Name",
      "email": "organizer@example.com"
    }
  }
}
```

---

### Create Event
- **Method:** POST
- **Endpoint:** `/events`
- **Authentication:** Required (Organizer role)
- **Description:** Create a new event

#### Request Body Validation Schema
```typescript
{
  title: yup.string().required("Title is required").min(3, "Title must be at least 3 characters"),
  description: yup.string().required("Description is required").min(10, "Description must be at least 10 characters"),
  location: yup.string().required("Location is required"),
  startDate: yup.date().required("Start date is required").typeError("Start date must be a valid date"),
  endDate: yup
    .date()
    .required("End date is required")
    .typeError("End date must be a valid date")
    .min(yup.ref("startDate"), "End date must be after start date"),
  price: yup
    .number()
    .required("Price is required")
    .min(0, "Price cannot be negative")
    .typeError("Price must be a number"),
  seatTotal: yup
    .number()
    .required("Total seats is required")
    .min(1, "Total seats must be at least 1")
    .integer("Total seats must be an integer"),
  category: yup.string().required("Category is required"),
  imageUrl: yup.string().url("Image URL must be a valid URL").nullable(),
  isPromoted: yup.boolean().default(false)
}
```

#### Example Request (multipart/form-data)
```
POST /events
Headers: Authorization: Bearer <JWT_TOKEN>

Form Data:
{
  "title": "New Festival",
  "description": "Amazing music festival with great artists",
  "location": "Jakarta Convention Center",
  "startDate": "2023-12-01T10:00:00.000Z",
  "endDate": "2023-12-02T10:00:00.000Z",
  "price": 100000,
  "seatTotal": 500,
  "category": "music",
  "isPromoted": true,
  "image": <file_upload>
}
```

#### Example Response
```json
{
  "success": true,
  "message": "Event created successfully",
  "data": {
    "id": "string",
    "title": "New Festival",
    "description": "Amazing music festival with great artists",
    "location": "Jakarta Convention Center",
    "startDate": "2023-12-01T10:00:00.000Z",
    "endDate": "2023-12-02T10:00:00.000Z",
    "price": 100000,
    "seatTotal": 500,
    "seatLeft": 500,
    "category": "music",
    "imageUrl": "uploads/events/image-123456789.jpg",
    "isPromoted": true,
    "organizerId": "string",
    "createdAt": "2023-11-01T10:00:00.000Z",
    "updatedAt": "2023-11-01T10:00:00.000Z"
  }
}
```

---

### Update Event
- **Method:** PUT
- **Endpoint:** `/events/:id`
- **Authentication:** Required (Organizer must own the event)
- **Description:** Update an existing event

#### Request Body Validation Schema
```typescript
{
  title: yup.string().min(3),
  description: yup.string().min(10),
  location: yup.string(),
  startDate: yup.date(),
  endDate: yup.date().min(yup.ref("startDate"), "End date must be after start date"),
  price: yup.number().min(0),
  seatTotal: yup.number().min(1).integer(),
  seatLeft: yup.number().min(0).integer(),
  category: yup.string(),
  imageUrl: yup.string().url().nullable(),
  isPromoted: yup.boolean()
}
```

#### Example Request
```json
PUT /events/12345678-1234-1234-1234-123456789012
Headers: Authorization: Bearer <JWT_TOKEN>

{
  "title": "Updated Festival Title",
  "price": 150000
}
```

#### Example Response
```json
{
  "success": true,
  "message": "Event updated successfully",
  "data": {
    "id": "string",
    "title": "Updated Festival Title",
    "description": "Amazing music festival with great artists",
    "location": "Jakarta Convention Center",
    "startDate": "2023-12-01T10:00:00.000Z",
    "endDate": "2023-12-02T10:00:00.000Z",
    "price": 150000,
    "seatTotal": 500,
    "seatLeft": 500,
    "category": "music",
    "imageUrl": "uploads/events/image-123456789.jpg",
    "isPromoted": true,
    "organizerId": "string",
    "createdAt": "2023-11-01T10:00:00.000Z",
    "updatedAt": "2023-11-02T10:00:00.000Z"
  }
}
```

---

### Delete Event
- **Method:** DELETE
- **Endpoint:** `/events/:id`
- **Authentication:** Required (Organizer must own the event)
- **Description:** Delete an event (soft delete)

#### Example Request
```
DELETE /events/12345678-1234-1234-1234-123456789012
Headers: Authorization: Bearer <JWT_TOKEN>
```

#### Example Response
```json
{
  "success": true,
  "message": "Event deleted successfully"
}
```

---

## Transactions

### Create Transaction
- **Method:** POST
- **Endpoint:** `/transactions`
- **Authentication:** Required
- **Description:** Create a new transaction for an event

#### Request Body Validation Schema
```typescript
{
  eventId: yup.string().uuid().required("Event ID is required"),
  voucherId: yup.string().uuid().optional(),
  pointsUsed: yup.number().integer().min(0).default(0),
  items: yup.array().of(
    yup.object().shape({
      quantity: yup.number().integer().min(1).required("Quantity is required"),
    })
  ).min(1, "At least one item is required").required(),
}
```

#### Example Request
```json
POST /transactions
Headers: Authorization: Bearer <JWT_TOKEN>

{
  "eventId": "12345678-1234-1234-1234-123456789012",
  "voucherId": "87654321-4321-4321-4321-210987654321",
  "pointsUsed": 10000,
  "items": [
    {
      "quantity": 2
    }
  ]
}
```

#### Example Response
```json
{
  "success": true,
  "message": "Transaction created successfully. Please upload payment proof within 2 hours.",
  "data": {
    "id": "string",
    "userId": "string",
    "eventId": "string",
    "voucherId": "string",
    "pointsUsed": 10000,
    "totalPrice": 200000,
    "finalPrice": 190000,
    "status": "WAITING_PAYMENT",
    "expiresAt": "2023-11-01T12:00:00.000Z",
    "createdAt": "2023-11-01T10:00:00.000Z",
    "updatedAt": "2023-11-01T10:00:00.000Z",
    "items": [
      {
        "id": "string",
        "transactionId": "string",
        "quantity": 2,
        "price": 100000
      }
    ],
    "event": {
      "id": "string",
      "title": "Event Title",
      "description": "Event Description",
      "location": "Event Location",
      "startDate": "2023-12-01T10:00:00.000Z",
      "endDate": "2023-12-02T10:00:00.000Z",
      "price": 100000,
      "seatTotal": 500,
      "seatLeft": 498,
      "category": "music",
      "imageUrl": "path/to/image.jpg",
      "isPromoted": false,
      "organizerId": "string",
      "createdAt": "2023-11-01T10:00:00.000Z",
      "updatedAt": "2023-11-01T10:00:00.000Z"
    },
    "voucher": {
      "id": "string",
      "code": "VOUCHER10",
      "discountAmount": 10000,
      "discountPercent": null,
      "maxUsage": 100,
      "usedCount": 1,
      "startDate": "2023-10-01T00:00:00.000Z",
      "endDate": "2023-12-31T23:59:59.000Z",
      "eventId": "string",
      "createdAt": "2023-10-01T00:00:00.000Z",
      "updatedAt": "2023-11-01T10:00:00.000Z"
    }
  }
}
```

---

### Get User Transactions
- **Method:** GET
- **Endpoint:** `/transactions/me`
- **Authentication:** Required
- **Description:** Retrieve current user's transactions

#### Example Request
```
GET /transactions/me
Headers: Authorization: Bearer <JWT_TOKEN>
```

#### Example Response
```json
{
  "success": true,
  "message": "User transactions retrieved successfully",
  "data": {
    "transactions": [
      {
        "id": "string",
        "userId": "string",
        "eventId": "string",
        "voucherId": "string",
        "pointsUsed": 0,
        "totalPrice": 200000,
        "finalPrice": 200000,
        "status": "DONE",
        "expiresAt": "2023-11-01T12:00:00.000Z",
        "paymentProofUrl": "uploads/payment-proofs/proof-123456789.jpg",
        "createdAt": "2023-11-01T10:00:00.000Z",
        "updatedAt": "2023-11-01T15:30:00.000Z",
        "event": {
          "id": "string",
          "title": "Event Title",
          "description": "Event Description",
          "location": "Event Location",
          "startDate": "2023-12-01T10:00:00.000Z",
          "endDate": "2023-12-02T10:00:00.000Z",
          "price": 100000,
          "seatTotal": 500,
          "seatLeft": 498,
          "category": "music",
          "imageUrl": "path/to/image.jpg",
          "isPromoted": false,
          "organizerId": "string",
          "createdAt": "2023-11-01T10:00:00.000Z",
          "updatedAt": "2023-11-01T10:00:00.000Z"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

---

### Get Transaction by ID
- **Method:** GET
- **Endpoint:** `/transactions/:id`
- **Authentication:** Required
- **Description:** Retrieve a specific transaction by ID

#### Example Request
```
GET /transactions/12345678-1234-1234-1234-123456789012
Headers: Authorization: Bearer <JWT_TOKEN>
```

#### Example Response
```json
{
  "success": true,
  "message": "Transaction retrieved successfully",
  "data": {
    "id": "string",
    "userId": "string",
    "eventId": "string",
    "voucherId": "string",
    "pointsUsed": 0,
    "totalPrice": 200000,
    "finalPrice": 200000,
    "status": "DONE",
    "expiresAt": "2023-11-01T12:00:00.000Z",
    "paymentProofUrl": "uploads/payment-proofs/proof-123456789.jpg",
    "createdAt": "2023-11-01T10:00:00.000Z",
    "updatedAt": "2023-11-01T15:30:00.000Z",
    "items": [
      {
        "id": "string",
        "transactionId": "string",
        "quantity": 2,
        "price": 100000
      }
    ],
    "event": {
      "id": "string",
      "title": "Event Title",
      "description": "Event Description",
      "location": "Event Location",
      "startDate": "2023-12-01T10:00:00.000Z",
      "endDate": "2023-12-02T10:00:00.000Z",
      "price": 100000,
      "seatTotal": 500,
      "seatLeft": 498,
      "category": "music",
      "imageUrl": "path/to/image.jpg",
      "isPromoted": false,
      "organizerId": "string",
      "createdAt": "2023-11-01T10:00:00.000Z",
      "updatedAt": "2023-11-01T10:00:00.000Z"
    },
    "voucher": {
      "id": "string",
      "code": "VOUCHER10",
      "discountAmount": 10000,
      "discountPercent": null,
      "maxUsage": 100,
      "usedCount": 1,
      "startDate": "2023-10-01T00:00:00.000Z",
      "endDate": "2023-12-31T23:59:59.000Z",
      "eventId": "string",
      "createdAt": "2023-10-01T00:00:00.000Z",
      "updatedAt": "2023-11-01T10:00:00.000Z"
    },
    "user": {
      "id": "string",
      "name": "User Name",
      "email": "user@example.com"
    }
  }
}
```

---

### Upload Payment Proof
- **Method:** POST
- **Endpoint:** `/transactions/:id/payment-proof`
- **Authentication:** Required (User must own the transaction)
- **Description:** Upload payment proof for a transaction

#### Request Validation Schema
```typescript
{
  id: yup.string().uuid().required("Transaction ID is required")
}
```

#### Example Request (multipart/form-data)
```
POST /transactions/12345678-1234-1234-1234-123456789012/payment-proof
Headers: Authorization: Bearer <JWT_TOKEN>

Form Data:
{
  "paymentProof": <file_upload>
}
```

#### Example Response
```json
{
  "success": true,
  "message": "Payment proof uploaded successfully. Waiting for admin verification.",
  "data": {
    "id": "string",
    "userId": "string",
    "eventId": "string",
    "voucherId": "string",
    "pointsUsed": 0,
    "totalPrice": 200000,
    "finalPrice": 200000,
    "status": "WAITING_ADMIN",
    "expiresAt": "2023-11-01T12:00:00.000Z",
    "paymentProofUrl": "uploads/payment-proofs/proof-123456789.jpg",
    "createdAt": "2023-11-01T10:00:00.000Z",
    "updatedAt": "2023-11-01T11:00:00.000Z"
  }
}
```

---

### Cancel Transaction
- **Method:** PUT
- **Endpoint:** `/transactions/:id/cancel`
- **Authentication:** Required (User must own the transaction)
- **Description:** Cancel a transaction and restore seats and points

#### Example Request
```
PUT /transactions/12345678-1234-1234-1234-123456789012/cancel
Headers: Authorization: Bearer <JWT_TOKEN>
```

#### Example Response
```json
{
  "success": true,
  "message": "Transaction canceled successfully. Seats and points have been restored."
}
```

---

## Reviews

### Get Event Reviews
- **Method:** GET
- **Endpoint:** `/reviews/events/:eventId`
- **Authentication:** None
- **Description:** Get all reviews for a specific event

#### Query Parameters Validation Schema
```typescript
{
  page: yup.number().min(1).default(1),
  limit: yup.number().min(1).default(10)
}
```

#### Example Request
```
GET /reviews/events/12345678-1234-1234-1234-123456789012?page=1&limit=10
```

#### Example Response
```json
{
  "success": true,
  "message": "Reviews retrieved successfully",
  "data": {
    "reviews": [
      {
        "id": "string",
        "eventId": "string",
        "userId": "string",
        "rating": 5,
        "comment": "Great event!",
        "createdAt": "2023-11-01T10:00:00.000Z",
        "updatedAt": "2023-11-01T10:00:00.000Z",
        "user": {
          "id": "string",
          "name": "User Name",
          "email": "user@example.com"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

---

### Create Review
- **Method:** POST
- **Endpoint:** `/reviews/events/:eventId`
- **Authentication:** Required
- **Description:** Create a review for an event

#### Request Body Validation Schema
```typescript
{
  rating: yup.number().required("Rating is required").integer().min(1).max(5),
  comment: yup.string().required("Comment is required").min(10, "Comment must be at least 10 characters")
}
```

#### Example Request
```json
POST /reviews/events/12345678-1234-1234-1234-123456789012
Headers: Authorization: Bearer <JWT_TOKEN>

{
  "rating": 5,
  "comment": "Absolutely amazing event! Highly recommended."
}
```

#### Example Response
```json
{
  "success": true,
  "message": "Review created successfully",
  "data": {
    "id": "string",
    "eventId": "string",
    "userId": "string",
    "rating": 5,
    "comment": "Absolutely amazing event! Highly recommended.",
    "createdAt": "2023-11-01T10:00:00.000Z",
    "updatedAt": "2023-11-01T10:00:00.000Z"
  }
}
```

---

### Get Eligible Reviews
- **Method:** GET
- **Endpoint:** `/reviews/me/eligible`
- **Authentication:** Required
- **Description:** Get events that the user is eligible to review

#### Example Request
```
GET /reviews/me/eligible
Headers: Authorization: Bearer <JWT_TOKEN>
```

#### Example Response
```json
{
  "success": true,
  "message": "Eligible reviews retrieved successfully",
  "data": {
    "events": [
      {
        "id": "string",
        "title": "Event Title",
        "startDate": "2023-10-15T10:00:00.000Z",
        "endDate": "2023-10-16T10:00:00.000Z",
        "location": "Event Location",
        "price": 100000,
        "category": "music",
        "imageUrl": "path/to/image.jpg",
        "isPromoted": false
      }
    ]
  }
}
```

---

### Update Review
- **Method:** PUT
- **Endpoint:** `/reviews/:id`
- **Authentication:** Required (User must own the review)
- **Description:** Update an existing review

#### Request Body Validation Schema
```typescript
{
  rating: yup.number().integer().min(1).max(5),
  comment: yup.string().min(10, "Comment must be at least 10 characters")
}
```

#### Example Request
```json
PUT /reviews/12345678-1234-1234-1234-123456789012
Headers: Authorization: Bearer <JWT_TOKEN>

{
  "rating": 4,
  "comment": "Good event, but could be better organized."
}
```

#### Example Response
```json
{
  "success": true,
  "message": "Review updated successfully",
  "data": {
    "id": "string",
    "eventId": "string",
    "userId": "string",
    "rating": 4,
    "comment": "Good event, but could be better organized.",
    "createdAt": "2023-11-01T10:00:00.000Z",
    "updatedAt": "2023-11-02T10:00:00.000Z"
  }
}
```

---

### Delete Review
- **Method:** DELETE
- **Endpoint:** `/reviews/:id`
- **Authentication:** Required (User must own the review)
- **Description:** Delete a review

#### Example Request
```
DELETE /reviews/12345678-1234-1234-1234-123456789012
Headers: Authorization: Bearer <JWT_TOKEN>
```

#### Example Response
```json
{
  "success": true,
  "message": "Review deleted successfully"
}
```

---

## Vouchers

### Create Voucher for Event
- **Method:** POST
- **Endpoint:** `/events/:eventId/vouchers`
- **Authentication:** Required (Organizer must own the event)
- **Description:** Create a voucher for an event

#### Request Body Validation Schema
```typescript
{
  code: yup.string().required("Voucher code is required"),
  discountAmount: yup.number().nullable().positive("Discount amount must be positive"),
  discountPercent: yup.number().nullable().min(0).max(100).test(
    'not-both-discounts',
    'Either discountAmount or discountPercent should be provided, not both',
    function(value) {
      const { discountAmount } = this.parent;
      if (discountAmount && value !== undefined && value !== null) {
        return false;
      }
      return true;
    }
  ),
  maxUsage: yup.number().required("Max usage is required").positive("Max usage must be positive"),
  startDate: yup.date().required("Start date is required"),
  endDate: yup.date().required("End date is required").min(yup.ref('startDate'), "End date must be after start date")
}
```

#### Example Request
```json
POST /events/12345678-1234-1234-1234-123456789012/vouchers
Headers: Authorization: Bearer <JWT_TOKEN>

{
  "code": "EARLY_BIRD",
  "discountAmount": 20000,
  "maxUsage": 50,
  "startDate": "2023-11-01T00:00:00.000Z",
  "endDate": "2023-11-15T23:59:59.000Z"
}
```

#### Example Response
```json
{
  "success": true,
  "message": "Voucher created successfully",
  "data": {
    "id": "string",
    "code": "EARLY_BIRD",
    "discountAmount": 20000,
    "discountPercent": null,
    "maxUsage": 50,
    "usedCount": 0,
    "startDate": "2023-11-01T00:00:00.000Z",
    "endDate": "2023-11-15T23:59:59.000Z",
    "eventId": "string",
    "createdAt": "2023-10-31T10:00:00.000Z",
    "updatedAt": "2023-10-31T10:00:00.000Z"
  }
}
```

---

### Validate Voucher
- **Method:** GET
- **Endpoint:** `/vouchers/:code/validate`
- **Authentication:** None
- **Description:** Validate a voucher code

#### Example Request
```
GET /vouchers/EARLY_BIRD/validate?eventId=12345678-1234-1234-1234-123456789012
```

#### Example Response
```json
{
  "success": true,
  "message": "Voucher is valid",
  "data": {
    "valid": true,
    "voucher": {
      "id": "string",
      "code": "EARLY_BIRD",
      "discountAmount": 20000,
      "discountPercent": null,
      "eventId": "string",
      "eventName": "Event Title"
    }
  }
}
```

---

## Database Schema

### Event Model
```prisma
model Event {
  id           String   @id @default(uuid())
  title        String
  description  String
  location     String
  startDate    DateTime
  endDate      DateTime
  price        Int      // in IDR
  seatTotal    Int      // total available seats
  seatLeft     Int      // available seats remaining
  category     String
  imageUrl     String?
  isPromoted   Boolean  @default(false)
  organizerId  String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  // Relations
  organizer   User       @relation(fields: [organizerId], references: [id])
  transactions Transaction[]
  vouchers    Voucher[]
  reviews     Review[]
  
  // Constraints
  @@check(seatLeft >= 0)
  @@check(seatLeft <= seatTotal)
  @@index([organizerId])
}
```

### Transaction Model
```prisma
model Transaction {
  id            String      @id @default(uuid())
  userId        String
  eventId       String
  voucherId     String?
  pointsUsed    Int         @default(0)
  totalPrice    Int         // original price
  finalPrice    Int         // after discounts
  status        TransactionStatus @default(WAITING_PAYMENT)
  expiresAt     DateTime    // auto-expire after 2 hours
  paymentProofUrl String?   // URL to uploaded payment proof
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  
  // Relations
  user    User      @relation(fields: [userId], references: [id])
  event   Event     @relation(fields: [eventId], references: [id])
  voucher Voucher?  @relation(fields: [voucherId], references: [id])
  items   TransactionItem[]
  
  // Constraints
  @@unique([userId, eventId]) // one transaction per user per event
  @@index([userId, status])
  @@index([eventId, status])
}
```

### Transaction Item Model
```prisma
model TransactionItem {
  id            String      @id @default(uuid())
  transactionId String
  quantity      Int         // number of tickets
  price         Int         // price per ticket
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  
  // Relations
  transaction Transaction @relation(fields: [transactionId], references: [id])
  
  // Constraints
  @@index([transactionId])
}
```

### Voucher Model
```prisma
model Voucher {
  id              String      @id @default(uuid())
  code            String      @unique
  eventId         String
  discountAmount  Int?        // fixed discount amount
  discountPercent Int?        // percentage discount
  maxUsage        Int         // max times this voucher can be used
  usedCount       Int         @default(0) // how many times it has been used
  startDate       DateTime    // when the voucher becomes active
  endDate         DateTime    // when the voucher expires
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  
  // Relations
  event        Event         @relation(fields: [eventId], references: [id])
  transactions Transaction[] // transactions that used this voucher
  
  // Constraints
  @@check(discountAmount != null || discountPercent != null) // either amount or percent must be set
  @@check(discountAmount == null || discountAmount > 0)
  @@check(discountPercent == null || (discountPercent >= 0 && discountPercent <= 100))
  @@check(maxUsage > 0)
  @@check(usedCount <= maxUsage)
  @@index([eventId])
}
```

### Review Model
```prisma
model Review {
  id        String   @id @default(uuid())
  eventId   String
  userId    String
  rating    Int      // 1 to 5
  comment   String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  user  User  @relation(fields: [userId], references: [id])
  event Event @relation(fields: [eventId], references: [id])
  
  // Constraints
  @@check(rating >= 1 && rating <= 5)
  @@unique([userId, eventId]) // one review per user per event
  @@index([eventId])
  @@index([userId])
}
```

### User Model
```prisma
model User {
  id            String            @id @default(uuid())
  name          String
  email         String            @unique
  password      String
  role          UserRole          @default(CUSTOMER)
  referralCode  String            @unique
  referredById  String?           // ID of user who referred this user
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt
  
  // Relations
  events         Event[]
  transactions   Transaction[]
  reviews        Review[]
  points         Point[]
  referredUsers  User[]            @relation("UserReferrals", references: [id])
  referringUser  User?             @relation("UserReferrals", fields: [referredById], references: [id])
  
  // Constraints
  @@index([email])
  @@index([referralCode])
}
```

### Point Model
```prisma
model Point {
  id        String   @id @default(uuid())
  userId    String
  amount    Int      // points amount
  expiresAt DateTime // when points expire (3 months from creation)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  user User @relation(fields: [userId], references: [id])
  
  // Constraints
  @@check(amount >= 0)
  @@index([userId])
  @@index([expiresAt])
}
```

### Enums
```prisma
enum UserRole {
  CUSTOMER
  ORGANIZER
}

enum TransactionStatus {
  WAITING_PAYMENT
  WAITING_ADMIN
  DONE
  REJECTED
  EXPIRED
  CANCELED
}
```

---

## Error Responses

### Validation Error
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "Title is required",
    "Price must be a number"
  ]
}
```

### Unauthorized Error
```json
{
  "success": false,
  "message": "No token provided. Authorization denied."
}
```

### Not Found Error
```json
{
  "success": false,
  "message": "Event not found"
}
```

### Generic Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## File Uploads

### Event Image Upload
- **Field Name:** `image`
- **File Types:** JPEG, JPG, PNG
- **Size Limit:** 2MB

### Payment Proof Upload
- **Field Name:** `paymentProof`
- **File Types:** JPEG, JPG, PNG
- **Size Limit:** 2MB

---

## Common Headers
- Content-Type: `application/json` (for JSON requests)
- Content-Type: `multipart/form-data` (for file uploads)
- Authorization: `Bearer <JWT_TOKEN>` (for authenticated requests)

## Notes for Frontend Developers
1. Always handle JWT token expiration gracefully by redirecting to login page
2. Implement proper loading states during API calls
3. Show validation errors to users in a user-friendly manner
4. Handle file upload progress indicators for better UX
5. Ensure proper error handling for network issues
6. Consider caching frequently accessed data to improve performance
7. Implement proper pagination for listing endpoints
8. Use optimistic updates where appropriate for better perceived performance