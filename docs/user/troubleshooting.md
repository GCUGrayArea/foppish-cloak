# Troubleshooting Guide

Solutions to common issues and error messages.

## Login and Authentication Issues

### "Invalid email or password"

**Symptoms:** Cannot log in, error message appears.

**Possible Causes:**
- Incorrect password
- Caps Lock is on
- Wrong email address
- Account not created yet

**Solutions:**
1. Verify email address is correct
2. Check Caps Lock is off
3. Try password reset
4. Contact administrator if account should exist

### "Account locked due to failed login attempts"

**Symptoms:** Cannot log in after multiple attempts.

**Cause:** Security feature after 5 failed logins in 15 minutes.

**Solutions:**
- Wait 30 minutes for automatic unlock
- Use password reset to unlock immediately
- Contact administrator if you believe this is an error

### Password reset email not received

**Symptoms:** No email after requesting password reset.

**Solutions:**
1. Check spam/junk folder
2. Wait 5-10 minutes (email may be delayed)
3. Verify correct email address
4. Add sender to safe senders list
5. Try requesting reset again
6. Contact administrator

### Session expired

**Symptoms:** Logged out unexpectedly.

**Cause:** Inactive for 24 hours or session invalidated.

**Solution:** Log in again. Enable "Remember me" if using trusted device.

## Document Upload Issues

### Upload fails or times out

**Symptoms:** Upload doesn't complete, error message, or timeout.

**Possible Causes:**
- File too large (>50MB)
- Unsupported file format
- Internet connection issue
- Browser issue

**Solutions:**
1. Check file size and reduce if over 50MB
2. Verify file is PDF, DOCX, or TXT
3. Check internet connection stability
4. Try different browser
5. Clear browser cache
6. Compress large PDFs
7. Split very large files into parts

### "File contains malware" error

**Symptoms:** Upload rejected with malware warning.

**Cause:** Virus scan detected potential threat.

**Solutions:**
1. Scan file with antivirus software
2. Verify file source is trustworthy
3. Get a clean copy of the document
4. Contact support if false positive suspected

### Document preview not showing

**Symptoms:** Can't see document preview in browser.

**Possible Causes:**
- Scanned PDF (image-based, not text)
- Browser compatibility
- Corrupted file

**Solutions:**
1. Download and open in PDF reader
2. Try different browser
3. Re-upload document
4. Verify file isn't corrupted

### Text extraction failed

**Symptoms:** Analysis can't read document text.

**Cause:** Document is scanned image or handwritten.

**Solutions:**
1. Use OCR software to make PDF searchable
2. Re-scan at higher quality
3. Convert images to text-based PDF
4. Manually type important information

## Analysis and Generation Issues

### Analysis taking very long

**Symptoms:** Analysis stuck or taking over 2 minutes.

**Possible Causes:**
- Very large document
- Multiple complex documents
- System load

**Solutions:**
1. Wait up to 3 minutes
2. Refresh page if no progress
3. Try analyzing fewer documents at once
4. Check internet connection
5. Contact support if persistent

### Generated letter missing information

**Symptoms:** Important facts not in generated letter.

**Possible Causes:**
- Facts not in analysis
- Template doesn't have relevant variables
- AI didn't include information

**Solutions:**
1. Check if facts are in analysis panel
2. Add missing facts to analysis manually
3. Verify template has appropriate variables
4. Manually add content to letter
5. Request refinement: "Include [specific information]"

### Generated letter has incorrect information

**Symptoms:** Wrong names, dates, or amounts.

**Cause:** AI extraction error or incorrect source data.

**Solutions:**
1. Edit the analysis to correct information
2. Regenerate letter with corrected analysis
3. Manually edit the letter
4. Verify source documents are correct

### Refinement not working as expected

**Symptoms:** Refinement doesn't make requested changes.

**Possible Causes:**
- Unclear refinement instruction
- Request conflicts with template
- AI limitation

**Solutions:**
1. Be more specific in refinement request
2. Try manual editing for precise changes
3. Request one change at a time
4. Verify change is possible given template structure

## Collaboration Issues

### Can't see other users' changes

**Symptoms:** Real-time updates not appearing.

**Possible Causes:**
- Internet connection issue
- Other user hasn't saved
- Browser cache problem

**Solutions:**
1. Check internet connection
2. Refresh browser
3. Ask collaborator to save changes
4. Clear browser cache
5. Check collaboration connection status

### "Sync conflict detected"

**Symptoms:** Warning about conflicting changes.

**Cause:** Simultaneous conflicting edits or connection interruption.

**Solutions:**
- System usually resolves automatically
- If persistent, refresh page
- Close duplicate browser tabs
- Check internet connection stability

### Lost changes during collaboration

**Symptoms:** Your edits disappeared.

**Possible Causes:**
- Another user reverted version
- Connection lost during save
- Conflict resolution

**Solutions:**
1. Check version history
2. Look for auto-saved draft
3. Ask team about reverts
4. Restore previous version if needed

## Export Issues

### Export button disabled

**Symptoms:** Cannot click export button.

**Possible Causes:**
- Unsaved changes
- AI operation in progress
- Permission issue

**Solutions:**
1. Save current changes (Ctrl+S)
2. Wait for any AI operations to complete
3. Verify you have export permission
4. Refresh page

### Export file won't open

**Symptoms:** Downloaded file gives error when opening.

**Possible Causes:**
- Incomplete download
- Corrupted file
- Missing software

**Solutions:**
1. Verify download completed fully
2. Re-export and download again
3. Try different PDF/Word viewer
4. Check file extension is correct (.docx or .pdf)

### Formatting lost in export

**Symptoms:** Exported file doesn't match editor.

**Cause:** Complex formatting not supported in export.

**Solutions:**
1. Use simpler formatting in editor
2. Export to Word first, then format and convert to PDF
3. Avoid complex nested elements
4. Check template formatting

### Firm letterhead not appearing

**Symptoms:** Exported file missing letterhead.

**Possible Causes:**
- Firm branding not configured
- Export settings incorrect

**Solutions:**
1. Verify firm branding configured (admin)
2. Check export settings
3. Try different export format
4. Clear cache and re-export

## Performance Issues

### Slow page loading

**Symptoms:** Pages take long time to load.

**Solutions:**
1. Check internet connection speed
2. Clear browser cache
3. Close other browser tabs
4. Try different browser
5. Restart browser
6. Check for browser extensions interfering

### Editor lag when typing

**Symptoms:** Delay between typing and text appearing.

**Possible Causes:**
- Very long document
- Too many collaborators
- Browser performance

**Solutions:**
1. Break very long letters into sections
2. Close other applications
3. Use simpler formatting
4. Try different browser
5. Restart computer

### Browser crash or freeze

**Symptoms:** Browser becomes unresponsive.

**Solutions:**
1. Force quit browser
2. Restart browser
3. Clear cache and cookies
4. Update browser to latest version
5. Try different browser
6. Check available memory

## Error Messages

### "Network error - please check connection"

**Cause:** Internet connection interrupted.

**Solutions:**
1. Check internet connection
2. Try accessing other websites
3. Restart router/modem
4. Wait and retry
5. Contact IT if corporate network issue

### "Session timeout - please log in again"

**Cause:** Session expired due to inactivity.

**Solution:** Log in again. Your work is auto-saved.

### "Insufficient permissions"

**Cause:** Trying to access feature beyond your role.

**Solutions:**
1. Contact administrator if you need access
2. Verify you have correct role
3. Check if feature requires higher permission level

### "Storage limit reached"

**Cause:** Firm storage quota exceeded.

**Solutions:**
1. Delete unused documents
2. Archive old cases
3. Contact administrator about increasing limit
4. Compress files before uploading

### "AI service unavailable"

**Cause:** Temporary issue with AI processing.

**Solutions:**
1. Wait a few minutes and retry
2. Check system status page
3. Contact support if persistent
4. Try again later

## Browser-Specific Issues

### Recommended Browsers

**Fully Supported:**
- Google Chrome (latest)
- Mozilla Firefox (latest)
- Microsoft Edge (latest)
- Safari (latest)

**Not Supported:**
- Internet Explorer (any version)
- Browsers more than 2 versions old

### Clearing Browser Cache

**Chrome:**
1. Ctrl+Shift+Delete
2. Select "Cached images and files"
3. Click "Clear data"

**Firefox:**
1. Ctrl+Shift+Delete
2. Select "Cache"
3. Click "Clear Now"

**Edge:**
1. Ctrl+Shift+Delete
2. Select "Cached data and files"
3. Click "Clear"

**Safari:**
1. Safari → Preferences → Privacy
2. Click "Manage Website Data"
3. Click "Remove All"

## Getting Additional Help

### Before Contacting Support

Collect this information:
- What you were trying to do
- Exact error message (screenshot if possible)
- Browser and version
- Steps to reproduce the issue
- When the issue started

### Contact Methods

1. **In-App Help**: Press `?` anywhere
2. **Firm Administrator**: Your first point of contact
3. **Support**: For technical issues
4. **Emergency Support**: For critical production issues

### Include in Support Request

- User email
- Firm name
- Detailed description
- Screenshots of error
- Date/time of issue
- Browser information
- Steps to reproduce

---

*For frequently asked questions, see [FAQ](./faq.md)*

*Last Updated: November 2025*
