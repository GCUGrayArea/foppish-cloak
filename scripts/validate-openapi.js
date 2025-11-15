#!/usr/bin/env node

/**
 * OpenAPI Specification Validator
 *
 * Validates the OpenAPI YAML file against the OpenAPI 3.0 spec.
 * Usage: node scripts/validate-openapi.js
 */

const SwaggerParser = require('@apidevtools/swagger-parser');
const path = require('path');

const specPath = path.join(__dirname, '../services/api/openapi.yaml');

async function validateSpec() {
  console.log('Validating OpenAPI specification...');
  console.log(`Spec file: ${specPath}\n`);

  try {
    // Validate the OpenAPI spec
    const api = await SwaggerParser.validate(specPath);

    console.log('✓ OpenAPI specification is valid!');
    console.log(`\nAPI Title: ${api.info.title}`);
    console.log(`API Version: ${api.info.version}`);
    console.log(`OpenAPI Version: ${api.openapi}`);

    // Count endpoints
    const paths = Object.keys(api.paths || {});
    let totalEndpoints = 0;
    paths.forEach(path => {
      const methods = Object.keys(api.paths[path] || {});
      totalEndpoints += methods.length;
    });

    console.log(`\nTotal Paths: ${paths.length}`);
    console.log(`Total Endpoints: ${totalEndpoints}`);

    // List tags
    if (api.tags && api.tags.length > 0) {
      console.log(`\nTags:`);
      api.tags.forEach(tag => {
        console.log(`  - ${tag.name}${tag.description ? ': ' + tag.description : ''}`);
      });
    }

    console.log('\n✓ Validation successful!');
    process.exit(0);
  } catch (error) {
    console.error('✗ OpenAPI specification is invalid!\n');
    console.error('Error:', error.message);

    if (error.errors) {
      console.error('\nDetailed errors:');
      error.errors.forEach((err, index) => {
        console.error(`  ${index + 1}. ${err.message}`);
        if (err.path) {
          console.error(`     Path: ${err.path.join(' > ')}`);
        }
      });
    }

    process.exit(1);
  }
}

// Run validation
validateSpec();
