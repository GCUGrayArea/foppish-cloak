import helmet from 'helmet';

/**
 * Enhanced security headers configuration using Helmet
 *
 * Implements comprehensive security headers following OWASP guidelines
 */
export const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles
      imgSrc: ["'self'", 'data:', 'https:'],
      fontSrc: ["'self'", 'https:', 'data:'],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },

  // Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true,
  },

  // X-Frame-Options - prevent clickjacking
  frameguard: {
    action: 'deny',
  },

  // X-Content-Type-Options - prevent MIME sniffing
  noSniff: true,

  // Referrer Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },

  // Permissions Policy (formerly Feature Policy)
  permittedCrossDomainPolicies: {
    permittedPolicies: 'none',
  },

  // X-DNS-Prefetch-Control
  dnsPrefetchControl: {
    allow: false,
  },

  // Hide X-Powered-By header
  hidePoweredBy: true,

  // X-Download-Options for IE8+
  ieNoOpen: true,
});

/**
 * Permissions-Policy header configuration
 * Restricts browser features that the application can use
 */
export const permissionsPolicy = (
  _req: any,
  res: any,
  next: () => void
): void => {
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );
  next();
};
