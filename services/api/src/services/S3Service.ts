/**
 * S3 Service
 *
 * Handles file storage using AWS S3 in production or local filesystem in development
 */

import fs from 'fs/promises';
import path from 'path';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface StorageConfig {
  mode: 'local' | 's3';
  localStoragePath?: string;
  s3Bucket?: string;
  s3Region?: string;
}

export interface UploadResult {
  bucket: string | null;
  key: string | null;
  localPath: string | null;
  url?: string;
}

export class S3Service {
  private config: StorageConfig;
  private s3Client?: S3Client;

  constructor() {
    // Determine storage mode from environment
    const mode = process.env.STORAGE_MODE === 's3' ? 's3' : 'local';

    this.config = {
      mode,
      localStoragePath: process.env.LOCAL_STORAGE_PATH || './uploads',
      s3Bucket: process.env.S3_BUCKET_NAME,
      s3Region: process.env.AWS_REGION || 'us-east-1'
    };

    // Initialize S3 client if in S3 mode
    if (this.config.mode === 's3') {
      if (!this.config.s3Bucket) {
        throw new Error('S3_BUCKET_NAME must be set when STORAGE_MODE is s3');
      }

      this.s3Client = new S3Client({
        region: this.config.s3Region
      });
    }
  }

  /**
   * Upload a file to storage
   */
  async uploadFile(
    fileBuffer: Buffer,
    filename: string,
    mimeType: string,
    firmId: string
  ): Promise<UploadResult> {
    if (this.config.mode === 's3') {
      return this.uploadToS3(fileBuffer, filename, mimeType, firmId);
    } else {
      return this.uploadToLocal(fileBuffer, filename, firmId);
    }
  }

  /**
   * Upload file to S3
   */
  private async uploadToS3(
    fileBuffer: Buffer,
    filename: string,
    mimeType: string,
    firmId: string
  ): Promise<UploadResult> {
    if (!this.s3Client || !this.config.s3Bucket) {
      throw new Error('S3 client not initialized');
    }

    // Create S3 key with firm prefix for organization
    const key = `firms/${firmId}/documents/${filename}`;

    const command = new PutObjectCommand({
      Bucket: this.config.s3Bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType,
      ServerSideEncryption: 'AES256'
    });

    await this.s3Client.send(command);

    return {
      bucket: this.config.s3Bucket,
      key,
      localPath: null
    };
  }

  /**
   * Upload file to local filesystem
   */
  private async uploadToLocal(
    fileBuffer: Buffer,
    filename: string,
    firmId: string
  ): Promise<UploadResult> {
    if (!this.config.localStoragePath) {
      throw new Error('Local storage path not configured');
    }

    // Create directory structure: uploads/firms/{firmId}/documents/
    const firmDir = path.join(this.config.localStoragePath, 'firms', firmId, 'documents');
    await fs.mkdir(firmDir, { recursive: true });

    const filePath = path.join(firmDir, filename);
    await fs.writeFile(filePath, fileBuffer);

    return {
      bucket: null,
      key: null,
      localPath: filePath
    };
  }

  /**
   * Get a signed URL for downloading a file (expires in 1 hour)
   */
  async getDownloadUrl(
    bucket: string | null,
    key: string | null,
    localPath: string | null
  ): Promise<string> {
    if (this.config.mode === 's3') {
      if (!this.s3Client || !bucket || !key) {
        throw new Error('S3 configuration or file reference missing');
      }

      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key
      });

      // Generate signed URL that expires in 1 hour
      const url = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
      return url;
    } else {
      if (!localPath) {
        throw new Error('Local file path missing');
      }

      // For local development, return a relative path that can be served
      // In production, this should be handled by the document download endpoint
      return `/documents/download/${path.basename(localPath)}`;
    }
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(
    bucket: string | null,
    key: string | null,
    localPath: string | null
  ): Promise<void> {
    if (this.config.mode === 's3') {
      if (!this.s3Client || !bucket || !key) {
        throw new Error('S3 configuration or file reference missing');
      }

      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: key
      });

      await this.s3Client.send(command);
    } else {
      if (!localPath) {
        throw new Error('Local file path missing');
      }

      try {
        await fs.unlink(localPath);
      } catch (error) {
        // File might already be deleted, log but don't throw
        console.error('Error deleting local file:', error);
      }
    }
  }

  /**
   * Get file from local storage (for development only)
   */
  async getLocalFile(localPath: string): Promise<Buffer> {
    if (this.config.mode !== 'local') {
      throw new Error('Local file access only available in local storage mode');
    }

    return fs.readFile(localPath);
  }

  /**
   * Check if a file exists
   */
  async fileExists(
    bucket: string | null,
    key: string | null,
    localPath: string | null
  ): Promise<boolean> {
    if (this.config.mode === 's3') {
      if (!this.s3Client || !bucket || !key) {
        return false;
      }

      try {
        const command = new GetObjectCommand({
          Bucket: bucket,
          Key: key
        });
        await this.s3Client.send(command);
        return true;
      } catch {
        return false;
      }
    } else {
      if (!localPath) {
        return false;
      }

      try {
        await fs.access(localPath);
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * Get storage mode
   */
  getStorageMode(): 'local' | 's3' {
    return this.config.mode;
  }
}
