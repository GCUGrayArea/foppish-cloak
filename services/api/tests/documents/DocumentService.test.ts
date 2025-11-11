/**
 * Document Service Unit Tests
 */

import { DocumentService } from '../../src/services/DocumentService';
import { S3Service } from '../../src/services/S3Service';
import { pool } from '../../src/db/connection';

// Mock dependencies
jest.mock('../../src/db/connection');
jest.mock('../../src/services/S3Service');

describe('DocumentService', () => {
  let documentService: DocumentService;
  let mockS3Service: jest.Mocked<S3Service>;
  let mockPool: jest.Mocked<typeof pool>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock pool
    mockPool = pool as jest.Mocked<typeof pool>;

    // Setup mock S3Service
    mockS3Service = {
      uploadFile: jest.fn(),
      getDownloadUrl: jest.fn(),
      deleteFile: jest.fn(),
      getLocalFile: jest.fn(),
      fileExists: jest.fn(),
      getStorageMode: jest.fn()
    } as any;

    // Create service instance
    documentService = new DocumentService();
    (documentService as any).s3Service = mockS3Service;
  });

  describe('uploadDocument', () => {
    it('should upload a document and store metadata in database', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test'),
        stream: null as any,
        destination: '',
        filename: '',
        path: ''
      };

      const firmId = 'firm-123';
      const uploadedBy = 'user-456';

      // Mock S3 upload
      mockS3Service.uploadFile.mockResolvedValue({
        bucket: 'test-bucket',
        key: 'firms/firm-123/documents/test.pdf',
        localPath: null
      });

      // Mock database insert
      mockPool.query.mockResolvedValue({
        rows: [
          {
            id: 'doc-789',
            firm_id: firmId,
            uploaded_by: uploadedBy,
            filename: 'test.pdf',
            file_type: 'application/pdf',
            file_size: '1024',
            s3_bucket: 'test-bucket',
            s3_key: 'firms/firm-123/documents/test.pdf',
            local_path: null,
            virus_scan_status: 'pending',
            virus_scan_date: null,
            metadata: JSON.stringify({
              originalName: 'test.pdf',
              mimeType: 'application/pdf',
              size: 1024,
              uploadDate: new Date()
            }),
            status: 'ready',
            created_at: new Date(),
            updated_at: new Date()
          }
        ],
        command: '',
        rowCount: 1,
        oid: 0,
        fields: []
      } as any);

      const result = await documentService.uploadDocument({
        file: mockFile,
        firmId,
        uploadedBy
      });

      expect(mockS3Service.uploadFile).toHaveBeenCalledWith(
        mockFile.buffer,
        expect.stringContaining('test.pdf'),
        'application/pdf',
        firmId
      );

      expect(mockPool.query).toHaveBeenCalled();
      expect(result.id).toBe('doc-789');
      expect(result.firmId).toBe(firmId);
      expect(result.filename).toBe('test.pdf');
    });

    it('should handle upload errors gracefully', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test'),
        stream: null as any,
        destination: '',
        filename: '',
        path: ''
      };

      mockS3Service.uploadFile.mockRejectedValue(new Error('S3 upload failed'));

      await expect(
        documentService.uploadDocument({
          file: mockFile,
          firmId: 'firm-123',
          uploadedBy: 'user-456'
        })
      ).rejects.toThrow('S3 upload failed');
    });
  });

  describe('getDocumentById', () => {
    it('should retrieve a document by ID with firm context', async () => {
      const documentId = 'doc-789';
      const firmId = 'firm-123';

      mockPool.query.mockResolvedValue({
        rows: [
          {
            id: documentId,
            firm_id: firmId,
            uploaded_by: 'user-456',
            filename: 'test.pdf',
            file_type: 'application/pdf',
            file_size: '1024',
            s3_bucket: 'test-bucket',
            s3_key: 'test-key',
            local_path: null,
            virus_scan_status: 'clean',
            virus_scan_date: new Date(),
            metadata: '{}',
            status: 'ready',
            created_at: new Date(),
            updated_at: new Date()
          }
        ],
        command: '',
        rowCount: 1,
        oid: 0,
        fields: []
      } as any);

      const result = await documentService.getDocumentById(documentId, firmId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(documentId);
      expect(result?.firmId).toBe(firmId);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [documentId, firmId]
      );
    });

    it('should return null if document not found', async () => {
      mockPool.query.mockResolvedValue({
        rows: [],
        command: '',
        rowCount: 0,
        oid: 0,
        fields: []
      } as any);

      const result = await documentService.getDocumentById('doc-nonexistent', 'firm-123');

      expect(result).toBeNull();
    });

    it('should enforce multi-tenant security', async () => {
      const documentId = 'doc-789';
      const correctFirmId = 'firm-123';
      const wrongFirmId = 'firm-999';

      // Simulate document belonging to different firm
      mockPool.query.mockResolvedValue({
        rows: [],
        command: '',
        rowCount: 0,
        oid: 0,
        fields: []
      } as any);

      const result = await documentService.getDocumentById(documentId, wrongFirmId);

      expect(result).toBeNull();
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [documentId, wrongFirmId]
      );
    });
  });

  describe('getDownloadUrl', () => {
    it('should generate a signed download URL', async () => {
      const documentId = 'doc-789';
      const firmId = 'firm-123';

      mockPool.query.mockResolvedValue({
        rows: [
          {
            id: documentId,
            firm_id: firmId,
            uploaded_by: 'user-456',
            filename: 'test.pdf',
            file_type: 'application/pdf',
            file_size: '1024',
            s3_bucket: 'test-bucket',
            s3_key: 'test-key',
            local_path: null,
            virus_scan_status: 'clean',
            virus_scan_date: new Date(),
            metadata: '{}',
            status: 'ready',
            created_at: new Date(),
            updated_at: new Date()
          }
        ],
        command: '',
        rowCount: 1,
        oid: 0,
        fields: []
      } as any);

      mockS3Service.getDownloadUrl.mockResolvedValue('https://signed-url.com');

      const result = await documentService.getDownloadUrl(documentId, firmId);

      expect(result.url).toBe('https://signed-url.com');
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(mockS3Service.getDownloadUrl).toHaveBeenCalledWith(
        'test-bucket',
        'test-key',
        null
      );
    });

    it('should throw error if document not found', async () => {
      mockPool.query.mockResolvedValue({
        rows: [],
        command: '',
        rowCount: 0,
        oid: 0,
        fields: []
      } as any);

      await expect(
        documentService.getDownloadUrl('doc-nonexistent', 'firm-123')
      ).rejects.toThrow('Document not found');
    });
  });

  describe('listDocuments', () => {
    it('should list documents for a firm with pagination', async () => {
      const firmId = 'firm-123';

      // Mock count query
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ count: '5' }],
          command: '',
          rowCount: 1,
          oid: 0,
          fields: []
        } as any)
        // Mock documents query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'doc-1',
              firm_id: firmId,
              uploaded_by: 'user-456',
              filename: 'test1.pdf',
              file_type: 'application/pdf',
              file_size: '1024',
              s3_bucket: 'test-bucket',
              s3_key: 'test-key-1',
              local_path: null,
              virus_scan_status: 'clean',
              virus_scan_date: new Date(),
              metadata: '{}',
              status: 'ready',
              created_at: new Date(),
              updated_at: new Date()
            },
            {
              id: 'doc-2',
              firm_id: firmId,
              uploaded_by: 'user-456',
              filename: 'test2.pdf',
              file_type: 'application/pdf',
              file_size: '2048',
              s3_bucket: 'test-bucket',
              s3_key: 'test-key-2',
              local_path: null,
              virus_scan_status: 'clean',
              virus_scan_date: new Date(),
              metadata: '{}',
              status: 'ready',
              created_at: new Date(),
              updated_at: new Date()
            }
          ],
          command: '',
          rowCount: 2,
          oid: 0,
          fields: []
        } as any);

      const result = await documentService.listDocuments({
        firmId,
        limit: 10,
        offset: 0
      });

      expect(result.documents).toHaveLength(2);
      expect(result.total).toBe(5);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(0);
    });

    it('should filter documents by uploadedBy', async () => {
      const firmId = 'firm-123';
      const uploadedBy = 'user-456';

      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ count: '2' }],
          command: '',
          rowCount: 1,
          oid: 0,
          fields: []
        } as any)
        .mockResolvedValueOnce({
          rows: [],
          command: '',
          rowCount: 0,
          oid: 0,
          fields: []
        } as any);

      await documentService.listDocuments({
        firmId,
        uploadedBy
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('uploaded_by'),
        expect.arrayContaining([firmId, uploadedBy])
      );
    });
  });

  describe('deleteDocument', () => {
    it('should delete a document from storage and database', async () => {
      const documentId = 'doc-789';
      const firmId = 'firm-123';

      // Mock getDocumentById
      mockPool.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: documentId,
              firm_id: firmId,
              uploaded_by: 'user-456',
              filename: 'test.pdf',
              file_type: 'application/pdf',
              file_size: '1024',
              s3_bucket: 'test-bucket',
              s3_key: 'test-key',
              local_path: null,
              virus_scan_status: 'clean',
              virus_scan_date: new Date(),
              metadata: '{}',
              status: 'ready',
              created_at: new Date(),
              updated_at: new Date()
            }
          ],
          command: '',
          rowCount: 1,
          oid: 0,
          fields: []
        } as any)
        // Mock update query
        .mockResolvedValueOnce({
          rows: [],
          command: '',
          rowCount: 1,
          oid: 0,
          fields: []
        } as any);

      mockS3Service.deleteFile.mockResolvedValue(undefined);

      await documentService.deleteDocument(documentId, firmId);

      expect(mockS3Service.deleteFile).toHaveBeenCalledWith(
        'test-bucket',
        'test-key',
        null
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE documents'),
        [documentId, firmId]
      );
    });

    it('should throw error if document not found', async () => {
      mockPool.query.mockResolvedValue({
        rows: [],
        command: '',
        rowCount: 0,
        oid: 0,
        fields: []
      } as any);

      await expect(
        documentService.deleteDocument('doc-nonexistent', 'firm-123')
      ).rejects.toThrow('Document not found');
    });
  });

  describe('updateVirusScanStatus', () => {
    it('should update virus scan status', async () => {
      const documentId = 'doc-789';
      const firmId = 'firm-123';

      mockPool.query.mockResolvedValue({
        rows: [
          {
            id: documentId,
            firm_id: firmId,
            uploaded_by: 'user-456',
            filename: 'test.pdf',
            file_type: 'application/pdf',
            file_size: '1024',
            s3_bucket: 'test-bucket',
            s3_key: 'test-key',
            local_path: null,
            virus_scan_status: 'clean',
            virus_scan_date: new Date(),
            metadata: '{}',
            status: 'ready',
            created_at: new Date(),
            updated_at: new Date()
          }
        ],
        command: '',
        rowCount: 1,
        oid: 0,
        fields: []
      } as any);

      const result = await documentService.updateVirusScanStatus(
        documentId,
        firmId,
        'clean'
      );

      expect(result.virusScanStatus).toBe('clean');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE documents'),
        ['clean', documentId, firmId]
      );
    });
  });
});
