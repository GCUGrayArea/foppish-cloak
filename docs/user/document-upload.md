# Document Upload

Learn how to upload, organize, and manage source documents for demand letter generation.

## Overview

The Demand Letter Generator uses your source documents to:
- Extract key facts (parties, dates, injuries)
- Identify damages and losses
- Generate accurate, fact-based demand letters

**Supported document types:**
- PDF (.pdf)
- Microsoft Word (.docx)
- Plain text (.txt)

## Uploading Documents

### Method 1: Drag and Drop

1. Navigate to the "Documents" page
2. Drag files from your computer
3. Drop them in the upload zone
4. Documents upload automatically

**Tip:** You can drag multiple files at once.

### Method 2: Click to Upload

1. Navigate to the "Documents" page
2. Click "Upload Document" button
3. Browse your computer
4. Select one or more files
5. Click "Open"

### Upload Requirements

**File specifications:**
- Maximum file size: 50MB per file
- Maximum files per upload: 10
- Total storage per firm: Contact administrator for limits
- Supported formats: PDF, DOCX, TXT

**File naming:**
- Use descriptive names
- Avoid special characters (except - and _)
- Keep names under 100 characters

**Best practices:**
- Name files clearly: "Smith_Medical_Records_2024.pdf"
- Avoid generic names like "Document1.pdf"
- Include dates when relevant
- Group related documents logically

### Upload Progress

During upload, you'll see:
- File name
- Upload progress bar
- File size
- Status (Uploading, Processing, Complete, Error)

**Processing steps:**
1. Upload to server (1-10 seconds per MB)
2. Virus scan (2-5 seconds)
3. Text extraction (5-15 seconds for PDFs)
4. Storage and indexing (1-2 seconds)

### Adding Document Metadata

After upload completes:

1. Enter document title (required)
2. (Optional) Add description
3. (Optional) Select document type:
   - Incident Report
   - Medical Records
   - Repair Estimate
   - Correspondence
   - Evidence
   - Other
4. (Optional) Add tags for organization
5. Click "Save"

**Why metadata matters:**
- Helps organize large document collections
- Makes documents easier to find
- Improves AI analysis accuracy
- Enables better filtering and searching

## Managing Documents

### Viewing Documents

**List View:**
- Default view showing all documents
- Columns: Title, Type, Upload Date, Size, Actions
- Sort by any column
- Search by title or description

**Card View:**
- Visual grid of documents
- Shows thumbnail preview
- Quick access to common actions

**Toggle views:**
- Click the grid/list icons in the top right

### Searching and Filtering

**Search:**
- Enter keywords in the search box
- Searches title, description, and tags
- Results update as you type

**Filter:**
- By document type
- By upload date range
- By file size
- By uploader (administrators only)

**Sort:**
- By title (A-Z or Z-A)
- By upload date (newest or oldest)
- By file size (largest or smallest)

### Viewing Document Details

1. Click on a document in the list
2. View details panel showing:
   - Full title and description
   - Document type and tags
   - Upload date and uploader
   - File size and format
   - Preview (for PDFs)
   - Usage (which demand letters use this document)

3. Available actions:
   - Download original file
   - Edit metadata
   - Delete document
   - View in fullscreen

### Editing Documents

**Editing metadata:**

1. Click the edit icon (pencil) on a document
2. Update fields:
   - Title
   - Description
   - Document type
   - Tags
3. Click "Save Changes"

**You cannot edit the file content itself.** To update content, upload a new version.

### Downloading Documents

To download a document:

1. Find the document in your list
2. Click the download icon or "Download" button
3. The original file downloads to your computer

**Bulk download:**
1. Select multiple documents (checkboxes)
2. Click "Download Selected"
3. Files download as a ZIP archive

### Deleting Documents

**Delete single document:**

1. Click the menu icon (⋯) on a document
2. Select "Delete"
3. Confirm deletion

**Warning:** Deleted documents cannot be recovered.

**Before deleting, check:**
- Is this document used in any demand letters?
- Do you have a backup copy?
- Are you sure you won't need it?

**Bulk delete:**
1. Select multiple documents (checkboxes)
2. Click "Delete Selected"
3. Confirm deletion

**What happens when you delete:**
- Document is permanently removed
- References in demand letters remain but show "Document deleted"
- Previously extracted facts remain in analysis

## Document Organization

### Using Tags

Tags help categorize and find documents:

**Adding tags:**
1. Edit document metadata
2. Type tag name in "Tags" field
3. Press Enter to add
4. Add multiple tags if needed
5. Save changes

**Suggested tags:**
- Case name or number
- Client name
- Document category
- Year or date
- Priority level

**Filtering by tags:**
- Click a tag on any document to see all documents with that tag
- Or use the tag filter in the sidebar

### Creating Folders (Coming Soon)

Folder organization will be available in a future update.

**Current workaround:** Use tags and consistent naming:
- Prefix with case name: "Smith_v_Jones_Medical.pdf"
- Use tags for categorization

## Document Types Explained

### Incident Report
Police reports, accident reports, incident summaries

**Best for:**
- Traffic accidents
- Workplace incidents
- Property damage events

### Medical Records
Medical bills, treatment records, diagnostic reports

**Best for:**
- Personal injury claims
- Medical malpractice
- Workers' compensation

### Repair Estimate
Vehicle repair estimates, property damage assessments

**Best for:**
- Property damage claims
- Auto accidents
- Construction defects

### Correspondence
Letters, emails, settlement communications

**Best for:**
- Prior demand letters
- Insurance correspondence
- Attorney communications

### Evidence
Photos, diagrams, witness statements (in text/PDF form)

**Best for:**
- Supporting documentation
- Visual evidence descriptions
- Witness affidavits

### Other
Any document not fitting other categories

## Best Practices

### Before Uploading

**Prepare documents:**
- Scan physical documents at 300 DPI or higher
- Ensure text is readable (not blurry)
- Remove password protection from PDFs
- Combine related pages into single files
- Remove unnecessary pages

**Organize on your computer:**
- Create a clear folder structure
- Use consistent file naming
- Group related documents
- Review for completeness

### File Quality

**For best AI analysis:**
- Use clear, high-quality scans
- Ensure text is machine-readable (not handwritten)
- Use searchable PDFs when possible
- Avoid scanning at angles
- Ensure adequate lighting in photos

**Poor quality affects:**
- Text extraction accuracy
- AI analysis quality
- Letter generation effectiveness

### Security Considerations

**Do:**
- Only upload necessary documents
- Verify documents before uploading
- Use secure internet connections
- Delete documents when no longer needed
- Review access permissions

**Don't:**
- Upload documents from unknown sources
- Share credentials with others
- Use public/unsecured Wi-Fi for sensitive uploads
- Upload documents not related to cases

### Storage Management

**Keep storage under control:**
- Delete outdated documents
- Archive completed cases
- Compress large files before upload
- Use document types appropriately

**Monitor usage:**
- Administrators can view firm storage usage
- Get alerts at 75%, 90% of limit
- Clean up periodically

## Troubleshooting

### Upload fails or times out

**Possible causes:**
- File too large (>50MB)
- Unsupported file type
- Internet connection issue
- Server maintenance

**Solutions:**
- Check file size and reduce if needed
- Verify file format (PDF, DOCX, TXT)
- Check internet connection
- Try again in a few minutes
- Split large files into smaller parts
- Contact support if problem persists

### "File contains malware" error

**Cause:** Virus scan detected potential threat

**Solutions:**
- Scan file on your computer with antivirus
- Verify file source is trustworthy
- Try a different copy of the document
- Contact support if you believe this is a false positive

### Can't download document

**Solutions:**
- Check your internet connection
- Verify browser allows downloads
- Try a different browser
- Clear browser cache
- Check disk space on your computer

### Document preview not showing

**Possible causes:**
- PDF is scanned image (not text-based)
- File is corrupted
- Browser compatibility issue

**Solutions:**
- Download and view locally
- Try different browser
- Re-upload document
- Use original application to verify file isn't corrupted

### Text extraction failed

**Possible causes:**
- Scanned image (not text-based PDF)
- Poor scan quality
- Handwritten text
- Encrypted or password-protected file

**Solutions:**
- Use OCR software before uploading
- Re-scan at higher quality
- Remove password protection
- Type out handwritten content

### Storage limit reached

**Solutions:**
- Delete unused documents
- Download and archive old cases
- Contact administrator about increasing limit
- Compress files before uploading

## Frequently Asked Questions

**How long are documents stored?**
Documents are stored indefinitely unless you delete them or your subscription ends.

**Can other users see my documents?**
Only users in your firm can see documents. Administrators can see all documents. Attorneys see their own.

**What happens if I upload a duplicate?**
The system allows duplicates but will notify you. You can choose to upload anyway or cancel.

**Can I upload images (JPG, PNG)?**
Not directly. Convert images to PDF first, or include them in a Word document.

**Is there a virus scan?**
Yes. All uploads are automatically scanned for viruses and malware.

**Can I upload password-protected PDFs?**
No. Remove password protection before uploading.

**How do I upload folders?**
Upload files individually or select multiple files. Folder structure is not preserved.

**Can I restore deleted documents?**
No. Deletion is permanent. Always keep backups of important files.

**Who can delete documents?**
The user who uploaded it, or any administrator.

**Do documents expire?**
No. Documents remain until manually deleted.

---

*For additional help, see [Troubleshooting](./troubleshooting.md) or [FAQ](./faq.md)*

*Last Updated: November 2025*
