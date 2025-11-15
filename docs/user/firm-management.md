# Firm Management

Learn how to manage your firm's settings, invite team members, and configure permissions.

## Overview

Firm Management features allow administrators to:
- Configure firm-wide settings
- Invite and manage team members
- Assign roles and permissions
- Monitor user activity
- Manage firm templates

**Note:** Most firm management features require administrator privileges.

## Roles and Permissions

### Available Roles

**Administrator**
- Full access to all features
- Manage firm settings
- Invite and remove users
- Create and edit templates
- Access all demand letters
- View usage and billing

**Attorney**
- Create and manage demand letters
- Upload and manage documents
- Use templates
- Export letters
- Collaborate with team members
- Cannot manage users or firm settings

**Paralegal**
- Upload and organize documents
- Assist with demand letter preparation
- View assigned demand letters
- Limited editing capabilities
- Cannot create templates or manage users

### Permission Matrix

| Feature | Administrator | Attorney | Paralegal |
|---------|--------------|----------|-----------|
| Create demand letters | ✓ | ✓ | View only |
| Upload documents | ✓ | ✓ | ✓ |
| Manage templates | ✓ | View only | View only |
| Invite users | ✓ | ✗ | ✗ |
| Firm settings | ✓ | ✗ | ✗ |
| Export letters | ✓ | ✓ | ✗ |
| View all letters | ✓ | Own only | Assigned only |

## Managing Team Members

### Inviting New Users

**Prerequisites:** You must be a firm administrator

**Steps:**

1. Navigate to "Firm Settings" from your profile menu
2. Click the "Users" tab
3. Click "Invite User"
4. Fill in the invitation form:
   - **Email address** - Where the invitation will be sent
   - **First name** - User's given name
   - **Last name** - User's family name
   - **Role** - Select Administrator, Attorney, or Paralegal
5. (Optional) Add a personal message
6. Click "Send Invitation"

**What happens next:**

- The user receives an email invitation
- They click the link to create their account
- They set their password
- They gain access based on their assigned role

**Invitation Expiration:**
- Invitations expire after 7 days
- You can resend expired invitations

### Viewing Team Members

1. Go to "Firm Settings" → "Users"
2. View the user list showing:
   - Name
   - Email
   - Role
   - Status (Active, Invited, Inactive)
   - Last login date

**Filter and search:**
- Search by name or email
- Filter by role
- Filter by status

### Editing User Roles

1. Go to "Firm Settings" → "Users"
2. Find the user you want to edit
3. Click the menu icon (⋯) next to their name
4. Select "Edit Role"
5. Choose the new role
6. Click "Save"

**Note:** Role changes take effect immediately.

### Deactivating Users

When a team member leaves:

1. Go to "Firm Settings" → "Users"
2. Find the user
3. Click the menu icon (⋯)
4. Select "Deactivate"
5. Confirm the action

**Effects of deactivation:**
- User can no longer log in
- Existing sessions are invalidated
- Documents and letters they created remain accessible
- Their work history is preserved

**Reactivating users:**
- Click the menu icon (⋯)
- Select "Reactivate"
- User can log in again with their existing password

### Removing Users Permanently

**Warning:** This action cannot be undone.

1. Go to "Firm Settings" → "Users"
2. Find the user
3. Click the menu icon (⋯)
4. Select "Remove User"
5. Type "DELETE" to confirm
6. Click "Permanently Remove"

**Effects:**
- User account is deleted
- User cannot be reactivated
- Documents and letters they created remain but show "Deleted User" as creator

**Best Practice:** Use "Deactivate" instead of "Remove" to preserve audit trails.

### Resending Invitations

If a user hasn't accepted their invitation:

1. Go to "Firm Settings" → "Users"
2. Find users with "Invited" status
3. Click "Resend Invitation"
4. A new invitation email is sent

## Firm Settings

### Firm Profile

Configure your firm's basic information:

1. Go to "Firm Settings" → "Profile"
2. Edit fields:
   - **Firm Name** - Official name
   - **Address** - Physical address
   - **Phone** - Main contact number
   - **Website** - Firm website URL
   - **Logo** - Upload firm logo (PNG, JPG, max 2MB)
3. Click "Save Changes"

**Where this information appears:**
- Exported demand letters (header/footer)
- Email templates
- User invitations

### Default Template Settings

Set firm-wide template defaults:

1. Go to "Firm Settings" → "Templates"
2. Configure:
   - Default template for new demand letters
   - Template categories
   - Required template fields
3. Click "Save"

### Email Notifications

Configure which emails users receive:

1. Go to "Firm Settings" → "Notifications"
2. Toggle notifications:
   - User invitations
   - Password resets
   - Demand letter completion
   - Collaboration invitations
   - Weekly summary emails
3. Click "Save Preferences"

### Usage and Billing

**Administrators only**

View usage statistics and costs:

1. Go to "Firm Settings" → "Usage & Billing"
2. View metrics:
   - Active users
   - Demand letters generated this month
   - AI tokens used
   - Storage used
   - Estimated monthly cost
3. Download usage reports (CSV)
4. View detailed cost breakdown

**Budget Alerts:**
- Set monthly budget limits
- Receive alerts at 75%, 90%, 100% of budget
- Prevent overages with hard limits (optional)

## Best Practices

### User Management

**Do:**
- Assign appropriate roles based on job function
- Regularly review user list for accuracy
- Deactivate users promptly when they leave
- Use descriptive personal messages in invitations
- Keep firm profile information current

**Don't:**
- Give administrator access unnecessarily
- Share login credentials between users
- Leave inactive users active
- Forget to onboard new users properly

### Security

**Regular Tasks:**
- Review active users monthly
- Audit administrator accounts quarterly
- Remove or deactivate ex-employees immediately
- Monitor unusual activity

**Access Control:**
- Use least-privilege principle (minimum necessary role)
- Review permissions when roles change
- Use attorney role as default for most legal staff
- Reserve administrator for 2-3 trusted users

### Onboarding New Users

**Recommended process:**

1. **Before sending invitation:**
   - Verify correct email address
   - Determine appropriate role
   - Prepare welcome materials

2. **Send invitation:**
   - Include personal welcome message
   - Explain next steps
   - Provide support contact

3. **After they accept:**
   - Verify they can log in
   - Point them to [Getting Started Guide](./getting-started.md)
   - Assign initial training
   - Add them to relevant collaborations

### Offboarding Users

**Recommended process:**

1. **Before their last day:**
   - Document their active demand letters
   - Transfer ownership if necessary
   - Export any needed reports

2. **On their last day:**
   - Deactivate their account
   - Remove from active collaborations
   - Archive their work

3. **After 90 days:**
   - Consider permanent removal if audit trail isn't needed
   - Or keep deactivated for records

## Troubleshooting

### User can't accept invitation

**Possible causes:**
- Invitation expired (7 days)
- Email went to spam
- Incorrect email address

**Solutions:**
- Check spam folder
- Verify email address
- Resend invitation
- Try different email address

### Changes to user role not taking effect

**Solution:**
- Ask user to log out and log back in
- Clear browser cache
- Wait a few minutes for changes to propagate

### Can't deactivate a user

**Possible causes:**
- You're not an administrator
- User is the only administrator
- System error

**Solutions:**
- Verify you have admin privileges
- Ensure at least one other active administrator
- Contact support if error persists

### Firm logo not displaying

**Requirements:**
- Format: PNG or JPG
- Max size: 2MB
- Recommended dimensions: 200x60px
- Transparent background (for PNG)

**Solutions:**
- Check file size and format
- Resize image if too large
- Clear browser cache
- Re-upload image

## Frequently Asked Questions

**How many users can our firm have?**
Contact your account manager about user limits and pricing.

**Can users have multiple roles?**
No. Each user has one role, but administrators can change roles at any time.

**Who can see all demand letters?**
Only administrators can see all letters. Attorneys see their own. Paralegals see assigned letters.

**Can I transfer demand letter ownership?**
Yes. Administrators can reassign ownership of any demand letter.

**What happens to a user's work when they're deactivated?**
All their documents, templates, and letters remain accessible. Their name appears as creator but marked as "(Inactive)".

**Can deactivated users be reactivated?**
Yes. Deactivated users can be reactivated by administrators at any time.

**How do I know who has administrator access?**
Go to "Firm Settings" → "Users" and filter by "Administrator" role.

**Can I export a user list?**
Yes. Click "Export" on the Users page to download a CSV.

---

*For additional help, see [Troubleshooting](./troubleshooting.md) or [FAQ](./faq.md)*

*Last Updated: November 2025*
