# API Documentation

This directory contains the OpenAPI 3.0 specification and Swagger UI configuration for the Demand Letter Generator API.

## Files

- `swagger.ts` - Swagger UI configuration and setup
- `swagger-theme.css` - Custom CSS theme for Swagger UI
- `schemas/` - OpenAPI schema definitions (split for maintainability)
  - `common.yaml` - Common schemas, error responses, parameters
  - `auth.yaml` - Authentication request/response schemas
  - `firm.yaml` - Firm management schemas
  - `user.yaml` - User management schemas
  - `document.yaml` - Document upload/management schemas
  - `template.yaml` - Template management schemas
  - `demand-letter.yaml` - Demand letter workflow schemas

## OpenAPI Specification

The main OpenAPI spec is located at: `services/api/openapi.yaml`

### Viewing the Documentation

1. Start the API server:
   ```bash
   cd services/api
   npm run dev
   ```

2. Open your browser to:
   - Swagger UI: http://localhost:3000/api/docs
   - Raw JSON: http://localhost:3000/api/docs/spec
   - Raw YAML: http://localhost:3000/api/docs/spec.yaml

### Validating the Spec

To validate the OpenAPI specification:

```bash
# Using Node.js validation script
node scripts/validate-openapi.js

# Or using the generate script
./scripts/generate-api-docs.sh
```

## API Endpoints Summary

The API includes **33 endpoints** across 6 categories:

### Authentication (6 endpoints)
- POST `/auth/register` - Register new user and firm
- POST `/auth/login` - Login user
- POST `/auth/refresh` - Refresh access token
- POST `/auth/logout` - Logout user
- POST `/auth/forgot-password` - Initiate password reset
- POST `/auth/reset-password` - Reset password with token

### Firms (5 endpoints)
- GET `/firms/{id}` - Get firm details
- PUT `/firms/{id}` - Update firm settings
- GET `/firms/{firmId}/users` - List firm users
- POST `/firms/{firmId}/users/invite` - Invite user to firm
- DELETE `/firms/{firmId}/users/{userId}` - Remove user from firm

### Users (3 endpoints)
- GET `/users/me` - Get current user profile
- PUT `/users/{id}` - Update user profile
- PUT `/users/{id}/role` - Change user role

### Documents (5 endpoints)
- POST `/documents/upload` - Upload source document
- GET `/documents` - List documents
- GET `/documents/{id}` - Get document metadata
- GET `/documents/{id}/download` - Get download URL
- DELETE `/documents/{id}` - Delete document

### Templates (6 endpoints)
- GET `/templates` - List templates
- POST `/templates` - Create template
- GET `/templates/{id}` - Get template details
- PUT `/templates/{id}` - Update template
- DELETE `/templates/{id}` - Delete template
- GET `/templates/{id}/versions` - Get version history
- POST `/templates/{id}/rollback` - Rollback to previous version

### Demand Letters (8 endpoints)
- GET `/demand-letters` - List demand letters
- POST `/demand-letters` - Create demand letter
- GET `/demand-letters/{id}` - Get demand letter details
- PUT `/demand-letters/{id}` - Update demand letter
- DELETE `/demand-letters/{id}` - Delete demand letter
- POST `/demand-letters/{id}/analyze` - Analyze documents
- POST `/demand-letters/{id}/generate` - Generate letter draft
- POST `/demand-letters/{id}/refine` - Refine letter with feedback
- GET `/demand-letters/{id}/status` - Get workflow status
- GET `/demand-letters/{id}/history` - Get revision history
- POST `/demand-letters/{id}/export` - Export to Word/PDF

## Authentication

All endpoints except `/auth/*` require authentication using a JWT Bearer token.

To authenticate in Swagger UI:
1. Click the "Authorize" button (lock icon)
2. Enter your JWT access token in the format: `Bearer <token>`
3. Click "Authorize"

To obtain a token:
1. Call POST `/auth/login` with your credentials
2. Copy the `accessToken` from the response
3. Use it in the Authorization header for subsequent requests

## SDK Generation

To generate client SDKs from the OpenAPI spec:

```bash
# Generate TypeScript and Python clients
./scripts/generate-clients.sh

# Or on Windows
.\scripts\generate-clients.ps1
```

Generated SDKs will be placed in `clients/` directory (gitignored).

## Updating the Documentation

When adding or modifying API endpoints:

1. Update the relevant schema file in `src/docs/schemas/`
2. Update the main `openapi.yaml` file with new paths
3. Validate the spec: `node scripts/validate-openapi.js`
4. Test in Swagger UI to ensure it renders correctly
5. Regenerate clients if needed

## Custom Theming

The Swagger UI uses a custom theme defined in `swagger-theme.css`. The theme:
- Hides the default Swagger top bar
- Uses custom colors for HTTP methods
- Improves button and input styling
- Adds better spacing and typography
- Implements responsive design

To modify the theme, edit `swagger-theme.css` and restart the API server.

## Best Practices

1. **Keep schemas in separate files** - Use the `schemas/` directory to organize schemas by domain
2. **Use $ref for reusability** - Reference common schemas instead of duplicating
3. **Provide examples** - Include example values in schemas for better documentation
4. **Document error responses** - Use the common error responses for consistency
5. **Keep descriptions clear** - Write concise, helpful descriptions for operations and parameters
6. **Validate frequently** - Run validation after any changes to catch errors early

## Troubleshooting

### Swagger UI not loading
- Ensure the API server is running
- Check that `swagger-ui-express` is installed
- Verify the OpenAPI spec path is correct in `swagger.ts`

### Validation errors
- Check YAML syntax (indentation, special characters)
- Ensure all $ref references point to valid schemas
- Verify all required fields are present in schemas

### $ref not resolving
- Use relative paths from the openapi.yaml file location
- Ensure referenced files exist in the correct path
- Check that the schema name matches exactly (case-sensitive)

## Resources

- [OpenAPI 3.0 Specification](https://swagger.io/specification/)
- [Swagger UI Documentation](https://swagger.io/tools/swagger-ui/)
- [OpenAPI Generator](https://openapi-generator.tech/)
- [Best Practices for API Design](https://swagger.io/resources/articles/best-practices-in-api-design/)
