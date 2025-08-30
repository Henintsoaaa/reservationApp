# Authentication System

This authentication system provides secure user registration, login, and JWT-based authorization for the reservation application.

## Features

- ✅ User Registration with validation
- ✅ User Login with email/password
- ✅ JWT Token-based authentication
- ✅ Password hashing with bcrypt
- ✅ Role-based access control (RBAC)
- ✅ Protected routes with guards
- ✅ Current user information retrieval
- ✅ Token refresh functionality
- ✅ Public route decorator for non-protected endpoints

## API Endpoints

### Authentication Endpoints

#### Register User

```http
POST /auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securepassword123",
  "role": "user" // Optional, defaults to "user"
}
```

#### Login User

```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

#### Get User Profile

```http
GET /auth/profile
Authorization: Bearer <jwt_token>
```

#### Refresh Token

```http
POST /auth/refresh
Authorization: Bearer <jwt_token>
```

## Response Format

All authentication endpoints return a consistent response format:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "64f8a7b2c4d5e6f7a8b9c0d1",
    "username": "johndoe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

## Usage in Controllers

### Protecting Routes

By default, all routes are protected due to the global JWT guard. To make a route public:

```typescript
import { Public } from '../auth/decorators/public.decorator';

@Public()
@Get('public-endpoint')
publicMethod() {
  return { message: 'This is a public endpoint' };
}
```

### Role-Based Access Control

```typescript
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@UseGuards(RolesGuard)
@Roles('admin', 'moderator')
@Delete(':id')
adminOnlyMethod() {
  return { message: 'Only admin and moderator can access this' };
}
```

### Getting Current User

```typescript
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Get('my-data')
getMyData(@CurrentUser() user: any) {
  return {
    message: `Hello ${user.username}`,
    userId: user.id,
    role: user.role
  };
}
```

## Security Features

### Password Security

- Passwords are hashed using bcrypt with 12 salt rounds
- Minimum password length of 6 characters
- Password validation during registration

### JWT Security

- Configurable secret key (set via environment variable)
- Configurable token expiration (default: 24 hours)
- Token includes user ID, email, username, and role

### Input Validation

- Email format validation
- Username minimum length validation
- Password strength validation
- Duplicate email/username prevention

## Environment Variables

Create a `.env` file with the following variables:

```env
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRATION=24h
MONGODB_URI=mongodb://root:example@localhost:27017
MONGODB_DB=reservation_db
```

## Error Handling

The authentication system provides clear error messages:

- `ConflictException`: When email or username already exists
- `UnauthorizedException`: When credentials are invalid
- `BadRequestException`: When user creation fails
- Validation errors for invalid input format

## Testing the Authentication

You can test the authentication endpoints using curl or any HTTP client:

```bash
# Register a new user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Access protected route
curl -X GET http://localhost:3000/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Architecture

The authentication system follows clean architecture principles:

```
src/auth/
├── decorators/           # Custom decorators
│   ├── current-user.decorator.ts
│   ├── public.decorator.ts
│   └── roles.decorator.ts
├── dto/                  # Data Transfer Objects
│   ├── login.dto.ts
│   └── register.dto.ts
├── guards/               # Route guards
│   ├── jwt-auth.guard.ts
│   └── roles.guard.ts
├── interfaces/           # TypeScript interfaces
│   └── auth.interface.ts
├── strategies/           # Passport strategies
│   └── jwt.strategy.ts
├── auth.controller.ts    # HTTP endpoints
├── auth.module.ts        # Module configuration
└── auth.service.ts       # Business logic
```
