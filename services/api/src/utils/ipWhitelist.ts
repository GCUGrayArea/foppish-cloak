import { Request, Response, NextFunction } from 'express';
import ipaddr from 'ipaddr.js';
import pool from '../db/pool';

/**
 * Check if an IP address matches a CIDR range
 */
function isIpInRange(ip: string, cidr: string): boolean {
  try {
    const addr = ipaddr.process(ip);
    const range = ipaddr.parseCIDR(cidr);

    return addr.match(range);
  } catch (error) {
    console.error('Error checking IP range:', error);
    return false;
  }
}

/**
 * Middleware to enforce IP whitelist for firms that have it enabled
 */
export async function enforceIpWhitelist(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get firm context from request
    const firm = (req as any).firm;

    // If no firm context, skip IP whitelist check
    if (!firm?.id) {
      return next();
    }

    // Check if firm has IP whitelist enabled
    const firmResult = await pool.query(
      'SELECT ip_whitelist_enabled FROM firms WHERE id = $1',
      [firm.id]
    );

    if (
      !firmResult.rows[0] ||
      !firmResult.rows[0].ip_whitelist_enabled
    ) {
      // IP whitelist not enabled for this firm
      return next();
    }

    // Get client IP
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.ip;

    if (!clientIp) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Unable to determine client IP address',
      });
    }

    // Get whitelisted IP ranges for this firm
    const whitelistResult = await pool.query(
      `SELECT ip_range FROM firm_ip_whitelist
       WHERE firm_id = $1 AND enabled = true`,
      [firm.id]
    );

    // Check if client IP matches any whitelisted range
    for (const row of whitelistResult.rows) {
      if (isIpInRange(clientIp, row.ip_range)) {
        // IP is whitelisted
        return next();
      }
    }

    // IP not whitelisted
    res.status(403).json({
      error: 'Forbidden',
      message: 'Access denied: IP address not whitelisted',
    });
  } catch (error) {
    console.error('IP whitelist enforcement error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to enforce IP whitelist',
    });
  }
}

/**
 * Validate CIDR notation
 */
export function isValidCidr(cidr: string): boolean {
  try {
    ipaddr.parseCIDR(cidr);
    return true;
  } catch {
    return false;
  }
}
