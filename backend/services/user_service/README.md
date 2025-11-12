# User Service

This service is responsible for managing user authentication, profiles, and other user-related data.

## Features

-   **User Authentication**: Handles user registration, login, and logout. It uses JSON Web Tokens (JWT) for authentication.
-   **Profile Management**: Allows users to view and update their profiles.
-   **Password Management**: Provides functionality for users to change their passwords and recover them if forgotten.
-   **Admin Role**: Supports an admin role with elevated privileges for managing users and other system settings.

## API Endpoints

For a detailed description of the API endpoints, please refer to the OpenAPI specification located at `docs/api/OPENAPI_EG_DOCS.yaml`.

## Database Schema

The database schema is defined using Prisma. You can find the schema definition in the `prisma/schema.prisma` file.

## Running the Service

To run the user service locally, you can use the following command:

```bash
npm run dev
```

This will start the service on port 3001.