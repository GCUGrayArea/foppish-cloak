/**
 * Security Headers Middleware Unit Tests
 */

import { Request, Response, NextFunction } from 'express';
import { securityHeaders, permissionsPolicy } from '../../services/api/src/middleware/security';

describe('Security Headers Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let setHeaderSpy: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      path: '/api/test',
      headers: {},
    };

    setHeaderSpy = jest.fn();

    mockResponse = {
      setHeader: setHeaderSpy,
      getHeader: jest.fn(),
      removeHeader: jest.fn(),
    };

    mockNext = jest.fn();
  });

  describe('securityHeaders (helmet)', () => {
    it('should be a function', () => {
      expect(typeof securityHeaders).toBe('function');
    });

    it('should call next middleware', () => {
      securityHeaders(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should set security headers', () => {
      securityHeaders(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Helmet sets various security headers
      expect(setHeaderSpy).toHaveBeenCalled();
    });

    it('should set Content-Security-Policy header', () => {
      securityHeaders(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Check if CSP header was set
      const cspCalls = setHeaderSpy.mock.calls.filter(
        (call) => call[0] === 'Content-Security-Policy'
      );

      expect(cspCalls.length).toBeGreaterThan(0);
    });

    it('should set Strict-Transport-Security header', () => {
      securityHeaders(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Check if HSTS header was set
      const hstsCalls = setHeaderSpy.mock.calls.filter(
        (call) => call[0] === 'Strict-Transport-Security'
      );

      expect(hstsCalls.length).toBeGreaterThan(0);
    });

    it('should set X-Frame-Options header', () => {
      securityHeaders(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Check if X-Frame-Options header was set
      const frameOptionsCalls = setHeaderSpy.mock.calls.filter(
        (call) => call[0] === 'X-Frame-Options'
      );

      expect(frameOptionsCalls.length).toBeGreaterThan(0);
    });

    it('should set X-Content-Type-Options header', () => {
      securityHeaders(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Check if X-Content-Type-Options header was set
      const contentTypeCalls = setHeaderSpy.mock.calls.filter(
        (call) => call[0] === 'X-Content-Type-Options'
      );

      expect(contentTypeCalls.length).toBeGreaterThan(0);
    });

    it('should remove X-Powered-By header', () => {
      securityHeaders(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Helmet should remove the X-Powered-By header
      expect(mockResponse.removeHeader).toHaveBeenCalledWith('X-Powered-By');
    });

    it('should set Referrer-Policy header', () => {
      securityHeaders(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Check if Referrer-Policy header was set
      const referrerCalls = setHeaderSpy.mock.calls.filter(
        (call) => call[0] === 'Referrer-Policy'
      );

      expect(referrerCalls.length).toBeGreaterThan(0);
    });
  });

  describe('permissionsPolicy', () => {
    it('should be a function', () => {
      expect(typeof permissionsPolicy).toBe('function');
    });

    it('should call next middleware', () => {
      permissionsPolicy(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should set Permissions-Policy header', () => {
      permissionsPolicy(mockRequest, mockResponse, mockNext);

      expect(setHeaderSpy).toHaveBeenCalledWith(
        'Permissions-Policy',
        'camera=(), microphone=(), geolocation=(), interest-cohort=()'
      );
    });

    it('should restrict camera access', () => {
      permissionsPolicy(mockRequest, mockResponse, mockNext);

      const calls = setHeaderSpy.mock.calls.find(
        (call) => call[0] === 'Permissions-Policy'
      );

      expect(calls).toBeDefined();
      expect(calls![1]).toContain('camera=()');
    });

    it('should restrict microphone access', () => {
      permissionsPolicy(mockRequest, mockResponse, mockNext);

      const calls = setHeaderSpy.mock.calls.find(
        (call) => call[0] === 'Permissions-Policy'
      );

      expect(calls).toBeDefined();
      expect(calls![1]).toContain('microphone=()');
    });

    it('should restrict geolocation access', () => {
      permissionsPolicy(mockRequest, mockResponse, mockNext);

      const calls = setHeaderSpy.mock.calls.find(
        (call) => call[0] === 'Permissions-Policy'
      );

      expect(calls).toBeDefined();
      expect(calls![1]).toContain('geolocation=()');
    });

    it('should block interest-cohort (FLoC)', () => {
      permissionsPolicy(mockRequest, mockResponse, mockNext);

      const calls = setHeaderSpy.mock.calls.find(
        (call) => call[0] === 'Permissions-Policy'
      );

      expect(calls).toBeDefined();
      expect(calls![1]).toContain('interest-cohort=()');
    });
  });

  describe('Security configuration', () => {
    it('should deny frame embedding', () => {
      securityHeaders(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const frameOptionsCalls = setHeaderSpy.mock.calls.find(
        (call) => call[0] === 'X-Frame-Options'
      );

      expect(frameOptionsCalls).toBeDefined();
      expect(frameOptionsCalls![1]).toBe('DENY');
    });

    it('should enable HSTS with includeSubDomains', () => {
      securityHeaders(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const hstsCalls = setHeaderSpy.mock.calls.find(
        (call) => call[0] === 'Strict-Transport-Security'
      );

      expect(hstsCalls).toBeDefined();
      expect(hstsCalls![1]).toContain('includeSubDomains');
    });

    it('should set nosniff for content type', () => {
      securityHeaders(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const contentTypeCalls = setHeaderSpy.mock.calls.find(
        (call) => call[0] === 'X-Content-Type-Options'
      );

      expect(contentTypeCalls).toBeDefined();
      expect(contentTypeCalls![1]).toBe('nosniff');
    });

    it('should restrict script sources in CSP', () => {
      securityHeaders(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const cspCalls = setHeaderSpy.mock.calls.find(
        (call) => call[0] === 'Content-Security-Policy'
      );

      expect(cspCalls).toBeDefined();
      // CSP should restrict script sources to 'self'
      expect(cspCalls![1]).toContain("script-src 'self'");
    });
  });
});
