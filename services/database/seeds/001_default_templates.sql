-- Default Template Seeds
-- Provides standard demand letter templates for new firms
-- Note: These are inserted with is_default = true and should reference a system firm

-- This seed file is OPTIONAL and should only be run if:
-- 1. A "system" firm exists for default templates
-- 2. A system admin user exists
-- 3. The firm wants to start with default templates

-- USAGE:
-- Replace <SYSTEM_FIRM_ID> and <SYSTEM_USER_ID> with actual UUIDs before running
-- psql -d demandletter -f services/database/seeds/001_default_templates.sql

-- =============================================================================
-- Template: Personal Injury Demand Letter
-- =============================================================================

DO $$
DECLARE
    template_id UUID;
    version_id UUID;
    template_content TEXT;
BEGIN
    -- Define template content
    template_content := '{{firm_name}}
{{firm_address}}
{{firm_phone}}

{{date}}

{{defendant_name}}
{{defendant_address}}

Re: Demand for Settlement - Personal Injury Claim
Case Number: {{case_number}}

Dear {{defendant_name}},

This letter serves as formal demand for settlement of damages sustained by our client, {{plaintiff_name}}, as a result of the incident that occurred on {{incident_date}} at {{incident_location}}.

STATEMENT OF FACTS

On {{incident_date}}, {{plaintiff_name}} was lawfully present at {{incident_location}} when the incident occurred. As a direct result of your negligence and/or the negligence of those for whom you are responsible, our client sustained serious injuries and damages.

INJURIES AND DAMAGES

Our client suffered the following injuries:
- Physical injuries requiring immediate medical attention
- Ongoing medical treatment and rehabilitation
- Pain and suffering
- Loss of enjoyment of life

MEDICAL EXPENSES

Total medical expenses incurred to date: {{medical_expenses}}

These expenses include:
- Emergency room treatment
- Follow-up medical appointments
- Physical therapy
- Prescription medications
- Medical equipment and supplies

PROPERTY DAMAGES

Property damages sustained: {{property_damages}}

LOST WAGES

Due to the injuries sustained, our client was unable to work, resulting in lost wages of: {{lost_wages}}

TOTAL DAMAGES

The total damages sustained by our client amount to: {{total_damages}}

DEMAND FOR SETTLEMENT

Based on the foregoing, we hereby demand payment in the amount of {{demand_amount}} in full and final settlement of all claims arising from this incident.

This offer remains open until {{deadline_date}}. If we do not receive your acceptance by this date, we will have no alternative but to pursue all available legal remedies, including filing a lawsuit seeking damages in excess of the amount stated herein, plus costs, interest, and attorney''s fees.

Please direct all communications regarding this matter to the undersigned.

Sincerely,

{{attorney_signature}}
{{attorney_name}}
Attorney at Law
{{firm_name}}';

    -- Create template record
    INSERT INTO templates (
        id,
        firm_id,
        name,
        description,
        is_default,
        created_by
    ) VALUES (
        gen_random_uuid(),
        '<SYSTEM_FIRM_ID>'::uuid,  -- Replace with actual system firm ID
        'Personal Injury Demand Letter',
        'Standard template for personal injury claims including medical expenses, lost wages, and property damages',
        true,
        '<SYSTEM_USER_ID>'::uuid   -- Replace with actual system user ID
    ) RETURNING id INTO template_id;

    -- Create initial version
    INSERT INTO template_versions (
        id,
        template_id,
        version_number,
        content,
        variables,
        created_by
    ) VALUES (
        gen_random_uuid(),
        template_id,
        1,
        template_content,
        '["attorney_name", "attorney_signature", "case_number", "date", "deadline_date", "defendant_address", "defendant_name", "demand_amount", "firm_address", "firm_name", "firm_phone", "incident_date", "incident_location", "lost_wages", "medical_expenses", "plaintiff_name", "property_damages", "total_damages"]'::jsonb,
        '<SYSTEM_USER_ID>'::uuid   -- Replace with actual system user ID
    ) RETURNING id INTO version_id;

    -- Link current version to template
    UPDATE templates
    SET current_version_id = version_id
    WHERE id = template_id;

    RAISE NOTICE 'Created template: Personal Injury Demand Letter (ID: %)', template_id;
END $$;

-- =============================================================================
-- Template: Property Damage Demand Letter
-- =============================================================================

DO $$
DECLARE
    template_id UUID;
    version_id UUID;
    template_content TEXT;
BEGIN
    -- Define template content
    template_content := '{{firm_name}}
{{firm_address}}
{{firm_phone}}

{{date}}

{{defendant_name}}
{{defendant_address}}

Re: Property Damage Claim
Case Number: {{case_number}}

Dear {{defendant_name}},

We represent {{plaintiff_name}} in connection with property damage sustained on {{incident_date}} at {{incident_location}}.

INCIDENT DESCRIPTION

On {{incident_date}}, property belonging to our client was damaged as a direct result of your actions and/or negligence. The incident occurred at {{incident_location}}.

DAMAGES SUSTAINED

Our client''s property sustained significant damage, including but not limited to:
- Structural damage
- Loss of personal property
- Diminution in property value
- Additional consequential damages

PROPERTY DAMAGE ASSESSMENT

A thorough assessment has been conducted, and the total property damages amount to: {{property_damages}}

DEMAND FOR PAYMENT

We hereby demand immediate payment in the amount of {{demand_amount}} to compensate our client for all property damages sustained.

This demand must be satisfied by {{deadline_date}}. Failure to respond or make payment by this date will result in the initiation of legal proceedings without further notice.

All correspondence should be directed to:

{{attorney_name}}
{{firm_name}}
{{firm_address}}
{{firm_phone}}

Sincerely,

{{attorney_signature}}
{{attorney_name}}
Attorney at Law';

    -- Create template record
    INSERT INTO templates (
        id,
        firm_id,
        name,
        description,
        is_default,
        created_by
    ) VALUES (
        gen_random_uuid(),
        '<SYSTEM_FIRM_ID>'::uuid,  -- Replace with actual system firm ID
        'Property Damage Demand Letter',
        'Standard template for property damage claims',
        true,
        '<SYSTEM_USER_ID>'::uuid   -- Replace with actual system user ID
    ) RETURNING id INTO template_id;

    -- Create initial version
    INSERT INTO template_versions (
        id,
        template_id,
        version_number,
        content,
        variables,
        created_by
    ) VALUES (
        gen_random_uuid(),
        template_id,
        1,
        template_content,
        '["attorney_name", "attorney_signature", "case_number", "date", "deadline_date", "defendant_address", "defendant_name", "demand_amount", "firm_address", "firm_name", "firm_phone", "incident_date", "incident_location", "plaintiff_name", "property_damages"]'::jsonb,
        '<SYSTEM_USER_ID>'::uuid   -- Replace with actual system user ID
    ) RETURNING id INTO version_id;

    -- Link current version to template
    UPDATE templates
    SET current_version_id = version_id
    WHERE id = template_id;

    RAISE NOTICE 'Created template: Property Damage Demand Letter (ID: %)', template_id;
END $$;

-- =============================================================================
-- Template: Contract Breach Demand Letter
-- =============================================================================

DO $$
DECLARE
    template_id UUID;
    version_id UUID;
    template_content TEXT;
BEGIN
    -- Define template content
    template_content := '{{firm_name}}
{{firm_address}}
{{firm_phone}}

{{date}}

{{defendant_name}}
{{defendant_address}}

Re: Demand for Damages - Breach of Contract
Contract Date: {{contract_date}}
Case Number: {{case_number}}

Dear {{defendant_name}},

We represent {{plaintiff_name}} regarding your material breach of the contract entered into on {{contract_date}}.

BREACH OF CONTRACT

You have failed to perform your obligations under the contract, specifically:

[Describe specific breaches]

DAMAGES INCURRED

As a direct result of your breach, our client has suffered the following damages:
- Direct financial losses
- Consequential damages
- Lost profits or business opportunities
- Additional costs incurred

Total damages amount to: {{total_damages}}

DEMAND FOR PAYMENT

We hereby demand payment of {{demand_amount}} in full satisfaction of all damages arising from your breach of contract.

This offer remains open until {{deadline_date}}. If payment is not received by this date, we will pursue all available remedies under the contract and applicable law, including but not limited to filing a lawsuit for damages, specific performance, and attorney''s fees.

Please remit payment or contact the undersigned immediately to discuss resolution.

Sincerely,

{{attorney_signature}}
{{attorney_name}}
Attorney at Law
{{firm_name}}';

    -- Create template record
    INSERT INTO templates (
        id,
        firm_id,
        name,
        description,
        is_default,
        created_by
    ) VALUES (
        gen_random_uuid(),
        '<SYSTEM_FIRM_ID>'::uuid,  -- Replace with actual system firm ID
        'Contract Breach Demand Letter',
        'Standard template for breach of contract claims',
        true,
        '<SYSTEM_USER_ID>'::uuid   -- Replace with actual system user ID
    ) RETURNING id INTO template_id;

    -- Create initial version
    INSERT INTO template_versions (
        id,
        template_id,
        version_number,
        content,
        variables,
        created_by
    ) VALUES (
        gen_random_uuid(),
        template_id,
        1,
        template_content,
        '["attorney_name", "attorney_signature", "case_number", "contract_date", "date", "deadline_date", "defendant_address", "defendant_name", "demand_amount", "firm_address", "firm_name", "firm_phone", "plaintiff_name", "total_damages"]'::jsonb,
        '<SYSTEM_USER_ID>'::uuid   -- Replace with actual system user ID
    ) RETURNING id INTO version_id;

    -- Link current version to template
    UPDATE templates
    SET current_version_id = version_id
    WHERE id = template_id;

    RAISE NOTICE 'Created template: Contract Breach Demand Letter (ID: %)', template_id;
END $$;
