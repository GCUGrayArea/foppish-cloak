/**
 * Swagger UI Configuration
 *
 * Sets up Swagger UI for interactive API documentation.
 * Serves OpenAPI specification at /api/docs.
 */

import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { Express } from 'express';

/**
 * Load OpenAPI specification from YAML file
 */
const loadOpenAPISpec = () => {
  const specPath = path.join(__dirname, '../../openapi.yaml');
  try {
    const spec = YAML.load(specPath);
    return spec;
  } catch (error) {
    console.error('Failed to load OpenAPI specification:', error);
    throw new Error('OpenAPI specification not found or invalid');
  }
};

/**
 * Swagger UI options
 */
const swaggerOptions: swaggerUi.SwaggerUiOptions = {
  customCss: '.swagger-ui .topbar { display: none }',  // Hide Swagger UI default top bar
  customSiteTitle: 'Demand Letter Generator API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,  // Remember auth token across page refreshes
    displayRequestDuration: true,  // Show request timing
    filter: true,  // Enable tag filtering
    tryItOutEnabled: true,  // Enable "Try it out" by default
    docExpansion: 'list',  // Show only tags by default
    defaultModelsExpandDepth: 3,  // Expand model schemas
    defaultModelExpandDepth: 3,
    tagsSorter: 'alpha',  // Sort tags alphabetically
    operationsSorter: 'alpha',  // Sort operations alphabetically
  },
};

/**
 * Setup Swagger UI for Express app
 *
 * @param app - Express application
 */
export const setupSwagger = (app: Express): void => {
  try {
    const openAPISpec = loadOpenAPISpec();

    // Serve Swagger UI at /api/docs
    app.use(
      '/api/docs',
      swaggerUi.serve,
      swaggerUi.setup(openAPISpec, swaggerOptions)
    );

    // Serve raw OpenAPI spec at /api/docs/spec
    app.get('/api/docs/spec', (req, res) => {
      res.json(openAPISpec);
    });

    // Serve raw OpenAPI spec as YAML at /api/docs/spec.yaml
    app.get('/api/docs/spec.yaml', (req, res) => {
      const specPath = path.join(__dirname, '../../openapi.yaml');
      res.sendFile(specPath);
    });

    console.log('Swagger UI available at /api/docs');
    console.log('OpenAPI spec available at /api/docs/spec (JSON) and /api/docs/spec.yaml (YAML)');
  } catch (error) {
    console.error('Failed to setup Swagger UI:', error);
  }
};
