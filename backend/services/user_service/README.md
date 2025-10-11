# 🧩 Authentication Microservice

This service handles **user authentication and authorization** using **Express**, **Prisma**, **bcrypt**, **JWT**, and **Zod**.  
It supports **user signup, login, and token-based authentication** for role-based access control.

---

## 📁 Table of Contents
- Overview
- Tech Stack
- Setup & Installation
- Environment Variables
- API Endpoints
    - POST /api/auth/signup
    - POST /api/auth/login
    - GET /api/users/me/sessions
- Authentication Middleware
- Role-based Authorization (Optional)
- JWT Structure
- Password Policy
- Error Responses
- Development Notes

---

## 🧠 Overview

This microservice provides:
- User registration with password validation
- User login and JWT-based session management
- Role-based access control (RBAC) (Admin/User roles)
- Secure password storage with bcrypt
- Schema validation using Zod
- CORS-enabled REST API for frontend integration

---

## ⚙️ Tech Stack

| Layer | Technology |
|-------|-------------|
| Framework | Express.js |
| ORM | Prisma |
| Database | Any Prisma-supported DB (e.g., PostgreSQL, MySQL, SQLite) |
| Auth | JSON Web Token (JWT) |
| Validation | Zod |
| Password Hashing | bcrypt |
| Config Management | dotenv |
| Cross-Origin Support | cors |

---

## 🚀 Setup & Installation

1. Clone the repository:
   git clone https://github.com/your-repo/auth-service.git
   cd backend/services/user_service

2. Install dependencies:
   npm install

3. Generate Prisma client:
   npx prisma generate

4. Start the development server:
   pnpm dev

The service runs by default on: http://localhost:3001

---

## 🔐 Environment Variables

Create a `.env` file in the root directory:

PORT=3001
DATABASE_URL="your_database_connection_string"
JWT_SECRET="your_super_secret_jwt_key"

Never commit `.env` to version control!

---

## 🧾 API Endpoints

### 1️⃣ POST /api/auth/signup

Registers a new user. Validates email and password, hashes the password, and stores the user in the database.

Request Body:
{
"email": "user@example.com",
"password": "StrongPass@123"
}

Response:
{
"message": "User created successfully.",
"token": "<jwt_token>"
}

### 2️⃣ POST /api/auth/login

Authenticates a user and returns a JWT token.

Request Body:
{
"email": "user@example.com",
"password": "StrongPass@123"
}

Response:
{
"message": "Login successful.",
"token": "<jwt_token>"
}

### 3️⃣ GET /api/users/me/sessions

Example of a protected route that requires a valid JWT token.

Headers:
Authorization: Bearer <jwt_token>

Response Example:
{
"message": "Authenticated request successful.",
"user": {
"id": "123",
"email": "user@example.com",
"role": "USER"
}
}

---

## 🧍‍♂️ Role-based Authorization (Optional)

Role check endpoint to be used by other services (currently commented out):

const isAdmin = (req, res, next) => {
if (req.user?.role !== Role.ADMIN) {
return res.status(403).json({ message: "Access denied. Admins only." });
}
next();
};

const isUser = (req, res, next) => {
if (req.user?.role !== Role.USER) {
return res.status(403).json({ message: "Access denied. Users only." });
}
next();
};

Example:
app.post('/api/admin/questions', authenticateToken, isAdmin, (req, res) => {
res.json({ message: `Welcome Admin ${req.user?.email}` });
});

---

## 🔑 JWT Structure

Each JWT payload includes:
{
"userId": "string",
"email": "string",
"role": "USER | ADMIN",
"iat": 1731345600,
"exp": 1731432000
}

Expiration: 24 hours

---

## 🧩 Password Policy

Length: Minimum 8 characters
Uppercase: At least one uppercase letter
Lowercase: At least one lowercase letter
Digit: At least one number
Special: At least one @$!%*?& symbol

---

## 🚨 Error Responses

400: Validation or bad request
401: Unauthorized (missing or wrong credentials)
403: Forbidden (invalid token or access denied)
409: Conflict (duplicate user)

---

## 🧑‍💻 Development Notes

- Prisma automatically sets new users’ role to USER (check schema).
- Extend schema to include ADMIN users if needed, else currently have to create admin by directly writing command into database.
- Use HTTPS in production to secure JWTs in transit.
- Refresh tokens are not yet implemented.

---

## 📘 License
 © 
