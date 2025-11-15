# Real-Time Collaboration

Learn how to work together on demand letters with your team in real-time.

## Overview

Real-time collaboration allows multiple users to:
- Edit demand letters simultaneously
- See live updates as colleagues make changes
- View who's currently editing
- Communicate through comments
- Track all changes and revisions

## Starting a Collaboration Session

### Sharing a Demand Letter

1. Open the demand letter you want to share
2. Click the "Share" button in the toolbar
3. Enter collaborator email addresses
4. Set permissions:
   - **Can Edit** - Full editing rights
   - **Can Comment** - View and comment only
   - **Can View** - Read-only access
5. (Optional) Add a message
6. Click "Share"

Collaborators receive an email notification with a direct link.

### Joining a Shared Letter

When someone shares a letter with you:

1. Check your email for the invitation
2. Click the link to open the letter
3. You'll see the letter in the workspace
4. Start editing (if you have edit permission)

**Or navigate manually:**
1. Go to "Demand Letters"
2. Filter by "Shared with Me"
3. Click the letter to open

## Collaboration Features

### Live Presence

See who's currently viewing or editing:

- **User avatars** appear in the top right
- **Cursor indicators** show where others are typing
- **Selection highlights** show what others have selected
- **Status badges** indicate user activity (editing, viewing, idle)

### Simultaneous Editing

Multiple users can edit at the same time:

- Changes appear in real-time (within 1 second)
- No conflicts - changes merge automatically
- Cursor positions update live
- Auto-save every 30 seconds

**Conflict Resolution:**
The system uses CRDT (Conflict-free Replicated Data Type) technology to merge simultaneous edits without conflicts.

### User Cursors

Each collaborator has a unique colored cursor:

- Cursor shows name label
- Cursor moves as they type
- Selection highlighting
- Temporarily fades when inactive

### Change Notifications

Stay aware of team activity:

- Small notification when someone joins
- Notification when someone makes a change
- Activity indicator in sidebar
- History shows who changed what

## Communication

### In-App Comments (Coming Soon)

Comment functionality will include:
- Highlight text and add comments
- Reply to comments
- Resolve comment threads
- @ mention team members

**Current workaround:** Use email or chat tools for communication.

## Managing Collaborators

### Viewing Collaborators

1. Click "Share Settings" button
2. View list of all users with access
3. See their permission level
4. View when they last accessed

### Changing Permissions

1. Open "Share Settings"
2. Find the user
3. Click their permission dropdown
4. Select new permission level:
   - Can Edit
   - Can Comment
   - Can View
5. Changes apply immediately

### Removing Access

1. Open "Share Settings"
2. Find the user
3. Click "Remove Access"
4. Confirm removal

User can no longer access the letter.

## Offline Mode

The collaboration system handles connectivity issues:

**If you lose connection:**
- Continue editing locally
- Changes queue for sync
- When reconnected, changes sync automatically
- Conflicts resolved automatically

**Reconnection:**
- Automatic reconnection attempts every 5 seconds
- Manual reconnect button if needed
- All changes preserved

## Version Control

### Change History

View complete change history:

1. Click "History" button
2. See timeline of all changes
3. Filter by user
4. Filter by date range
5. View details of each change

**Change details include:**
- Who made the change
- When it was made
- What was changed (additions, deletions)
- Change description

### Restoring Previous Versions

If you need to revert changes:

1. Open "History"
2. Find the version you want
3. Click "Restore This Version"
4. Confirm restoration

**Warning:** Restoring replaces current content. Consider duplicating the letter first.

## Best Practices

### Collaboration Etiquette

**Do:**
- Communicate before major changes
- Use descriptive change messages
- Respect others' work in progress
- Coordinate editing sections
- Save frequently

**Don't:**
- Delete others' work without discussion
- Make major changes without warning
- Edit someone's active section
- Ignore presence indicators

### Effective Collaboration

**For smooth teamwork:**
- Assign sections to specific team members
- Use comments for questions/suggestions
- Schedule coordination time for major edits
- Review each other's work
- Keep the team informed of progress

### Managing Simultaneous Edits

**To avoid conflicts:**
- Work on different sections when possible
- Communicate who's editing what
- Use section assignments
- Be aware of active cursors
- Coordinate major structural changes

## Security and Privacy

**Access Control:**
- Only shared users can access
- Firm-level data isolation
- Audit trail of all access
- Administrators can view all letters

**Data Protection:**
- All changes encrypted in transit
- Real-time sync uses secure WebSocket (WSS)
- Automatic backup every hour
- Change history preserved

## Troubleshooting

**Changes not appearing:**
- Check internet connection
- Verify others have saved
- Refresh browser
- Check if you're in offline mode

**Can't see other users:**
- Verify they have access
- Check if they're actually online
- Refresh your view
- Check connection status

**Sync conflicts:**
- Usually resolves automatically
- If persistent, refresh page
- Check for multiple tabs open
- Contact support if continues

**Lost changes:**
- Check version history
- Look for auto-saved drafts
- Verify you had edit permission
- Contact support for recovery

## Frequently Asked Questions

**How many people can edit simultaneously?**
Up to 10 users can edit the same letter simultaneously.

**Do I need to be online?**
For collaboration, yes. Offline mode queues changes for later sync.

**Can I revoke access after sharing?**
Yes, at any time through Share Settings.

**What happens if two people edit the same sentence?**
Changes merge automatically. Last edit wins for conflicting text.

**Is there a mobile app for collaboration?**
Not yet. Use web browser on mobile devices.

**Can I collaborate with users outside my firm?**
No. Collaboration is limited to users within your firm.

**How long is change history kept?**
Indefinitely, unless the letter is deleted.

**Can administrators see all my edits?**
Yes. Administrators can view change history for audit purposes.

---

*For additional help, see [Troubleshooting](./troubleshooting.md) or [FAQ](./faq.md)*

*Last Updated: November 2025*
