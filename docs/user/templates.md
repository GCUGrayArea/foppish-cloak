# Templates

Learn how to create, edit, and manage demand letter templates with dynamic variables.

## Overview

Templates define the structure and content of your demand letters. They include:
- Standard legal language
- Dynamic variables for case-specific information
- Firm branding and formatting
- Reusable components

**Who can manage templates:**
- Administrators: Full access (create, edit, delete)
- Attorneys: View and use templates
- Paralegals: View templates only

## Creating a New Template

1. Navigate to "Templates" from the sidebar
2. Click "New Template"
3. Fill in template details:
   - **Name**: Descriptive template name (e.g., "Auto Accident Demand")
   - **Category**: Type of case (Personal Injury, Property Damage, etc.)
   - **Description**: Brief explanation of when to use this template
4. Click "Create"

## Template Editor

### Editor Interface

The template editor has three panels:

**Left Panel - Variables**
- Available variables you can insert
- Organized by category (Parties, Incident, Damages, etc.)
- Click to insert into template

**Center Panel - Content Editor**
- Rich text editor for template content
- Format text (bold, italic, lists)
- Insert variables
- Preview formatting

**Right Panel - Preview**
- Real-time preview of your template
- Shows how variables will appear
- Toggle preview on/off

### Using Variables

Variables are placeholders that get replaced with case-specific information:

**Syntax:**
```
{{variable_name}}
```

**Common Variables:**

**Parties:**
- `{{plaintiff_name}}` - Plaintiff's full name
- `{{defendant_name}}` - Defendant's full name
- `{{plaintiff_attorney}}` - Your name/firm name

**Incident Details:**
- `{{incident_date}}` - Date of incident
- `{{incident_location}}` - Where incident occurred
- `{{incident_description}}` - Brief description

**Injuries & Damages:**
- `{{injuries}}` - List of injuries sustained
- `{{medical_expenses}}` - Total medical costs
- `{{lost_wages}}` - Lost income amount
- `{{property_damage}}` - Property damage amount
- `{{total_damages}}` - Sum of all damages
- `{{demand_amount}}` - Settlement demand amount

**Dates:**
- `{{current_date}}` - Today's date
- `{{deadline_date}}` - Response deadline

### Inserting Variables

**Method 1: Click to Insert**
1. Place cursor where you want the variable
2. Click variable in left panel
3. Variable is inserted at cursor position

**Method 2: Type Variable Name**
1. Type `{{` to trigger autocomplete
2. Start typing variable name
3. Select from dropdown
4. Press Enter to insert

**Method 3: Copy/Paste**
Copy the variable syntax from this documentation and paste into your template.

### Formatting

**Text Formatting:**
- **Bold**: Ctrl+B / Cmd+B
- *Italic*: Ctrl+I / Cmd+I
- Underline: Ctrl+U / Cmd+U
- Lists: Bullet or numbered

**Paragraphs:**
- Headings: Use heading styles (H1, H2, H3)
- Alignment: Left, center, right, justify
- Line spacing: Single, 1.5, double

**Special Elements:**
- Horizontal rules
- Block quotes
- Tables (simple 2-3 column)

## Example Template

Here's a basic auto accident demand letter template:

```
[YOUR FIRM LETTERHEAD]

{{current_date}}

{{defendant_name}}
{{defendant_address}}

Re: Demand for Settlement - {{plaintiff_name}} v. {{defendant_name}}
    Date of Incident: {{incident_date}}

Dear {{defendant_name}}:

This office represents {{plaintiff_name}} in connection with injuries and damages sustained in a motor vehicle accident that occurred on {{incident_date}} at {{incident_location}}.

INCIDENT DESCRIPTION

On {{incident_date}}, {{incident_description}}

The accident was directly caused by your negligent operation of your vehicle.

INJURIES AND MEDICAL TREATMENT

As a direct and proximate result of your negligence, {{plaintiff_name}} sustained the following injuries:

{{injuries}}

{{plaintiff_name}} incurred medical expenses totaling {{medical_expenses}}.

DAMAGES

{{plaintiff_name}} has suffered the following damages:

- Medical Expenses: {{medical_expenses}}
- Lost Wages: {{lost_wages}}
- Pain and Suffering: {{pain_suffering}}
- Property Damage: {{property_damage}}

TOTAL DAMAGES: {{total_damages}}

DEMAND

We demand payment of {{demand_amount}} to settle this matter in full. This demand is valid until {{deadline_date}}.

Please contact our office within 30 days to discuss settlement.

Sincerely,

{{plaintiff_attorney}}
{{firm_name}}
{{firm_address}}
{{firm_phone}}
```

## Managing Templates

### Viewing Templates

Templates page shows:
- Template name
- Category
- Last modified date
- Version number
- Actions (Edit, Duplicate, Delete)

**Filter by:**
- Category
- Creation date
- Last modified

**Search:**
- By template name or description

### Editing Templates

1. Find template in list
2. Click "Edit" button
3. Make changes in editor
4. Click "Save"

**Auto-save:**
- Templates auto-save every 30 seconds
- Manual save: Ctrl+S / Cmd+S

### Version History

Every time you save, a new version is created:

1. Click "Version History" button
2. View list of all versions with timestamps
3. Compare versions side-by-side
4. Restore a previous version if needed

**Restoring a version:**
1. Select version to restore
2. Click "Restore This Version"
3. Confirm action
4. Template reverts to selected version

### Duplicating Templates

To create a template based on an existing one:

1. Find template to duplicate
2. Click menu (⋯) → "Duplicate"
3. Enter new template name
4. Click "Duplicate"
5. Edit the copy as needed

### Deleting Templates

**Warning:** Deleted templates cannot be used for new demand letters.

1. Click menu (⋯) → "Delete"
2. Confirm deletion
3. Template is archived (not permanently deleted)

**What happens:**
- Template can't be selected for new letters
- Existing letters using this template are unaffected
- Administrators can restore deleted templates

## Variable Reference

See the Variables panel in the template editor for a complete, up-to-date list of available variables.

## Best Practices

**Template Design:**
- Start with a proven template structure
- Use clear, professional language
- Include all necessary legal elements
- Test with sample data before using

**Variables:**
- Use variables for all case-specific information
- Don't hard-code client names or dates
- Provide defaults or examples in description
- Test that all variables populate correctly

**Organization:**
- Use descriptive template names
- Assign appropriate categories
- Keep similar templates together
- Archive outdated templates

**Maintenance:**
- Review templates quarterly
- Update based on legal developments
- Get attorney review before major changes
- Keep version history for reference

## Troubleshooting

**Variable not appearing in generated letter:**
- Check variable spelling exactly matches
- Ensure variable has data in the analysis
- Verify variable exists in current version

**Formatting lost in export:**
- Some formatting may not transfer to Word
- Use basic formatting (bold, italic, headings)
- Test export before finalizing template

**Template editor slow:**
- Large templates (>10 pages) may be slower
- Break very long templates into sections
- Clear browser cache
- Use modern browser (Chrome, Firefox, Edge)

## Frequently Asked Questions

**Can I import existing Word templates?**
Not directly. Copy/paste content and add variables manually.

**How many templates can I create?**
Unlimited templates per firm.

**Can I share templates with other firms?**
No. Templates are firm-specific for confidentiality.

**What if I need a new variable?**
Contact your administrator or support to request new variables.

**Can templates include images?**
Not currently. Use firm letterhead in exports instead.

---

*For additional help, see [Troubleshooting](./troubleshooting.md) or [FAQ](./faq.md)*

*Last Updated: November 2025*
