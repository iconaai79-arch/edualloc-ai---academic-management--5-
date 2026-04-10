
-- E-Agreement Templates Table
CREATE TABLE IF NOT EXISTS law_agreement_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- e.g., 'Real Estate', 'Commercial', 'Family'
    content TEXT NOT NULL, -- Templates with {{placeholders}}
    base_fee DECIMAL(12, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generated Agreements Table
CREATE TABLE IF NOT EXISTS law_agreements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    template_id UUID REFERENCES law_agreement_templates(id),
    matter_id UUID REFERENCES law_matters(id) ON DELETE SET NULL,
    client_id UUID REFERENCES law_clients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    party_details JSONB NOT NULL, -- The data filled in by parties
    final_content TEXT, -- The final generated text
    payment_status TEXT DEFAULT 'unpaid', -- 'unpaid', 'paid'
    review_status TEXT DEFAULT 'draft', -- 'draft', 'pending_approval', 'approved', 'rejected'
    lawyer_id UUID REFERENCES users(id), -- The lawyer who will approve
    lawyer_notes TEXT,
    signed_url TEXT, -- Link to signed PDF if any
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE law_agreement_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE law_agreements ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view templates of their institution" ON law_agreement_templates
    FOR SELECT USING (institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage templates" ON law_agreement_templates
    FOR ALL USING (institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can view agreements of their institution" ON law_agreements
    FOR SELECT USING (institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can create/update agreements" ON law_agreements
    FOR ALL USING (institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()));
