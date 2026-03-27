-- TruScan Systems - Supabase Schema
-- Run this in your Supabase SQL Editor to set up the database

-- 1. Agents Table
CREATE TABLE IF NOT EXISTS public.truscan_agents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_code text UNIQUE NOT NULL,
    agent_name text NOT NULL,
    whatsapp_number text UNIQUE NOT NULL,
    email text UNIQUE,
    total_referrals integer DEFAULT 0,
    total_earnings numeric(12, 2) DEFAULT 0.00,
    commission_tier text DEFAULT 'Standard',
    qr_image_path text,
    status text DEFAULT 'active',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 2. Funnel (Leads) Table
CREATE TABLE IF NOT EXISTS public.truscan_funnel (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name text NOT NULL,
    contact_number text,
    whatsapp_number text NOT NULL,
    entry_category text, -- e.g., 'Retail', 'Manufacturing'
    primary_bottleneck text, -- The message/problem description
    agent_id text REFERENCES public.truscan_agents(agent_code),
    funnel_stage text DEFAULT 'lead_captured', -- 'lead_captured', 'contacted', 'qualified', 'proposal_sent', 'closed_won'
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 3. Agent Logs (Visits/Clicks)
CREATE TABLE IF NOT EXISTS public.truscan_agent_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id text REFERENCES public.truscan_agents(agent_code),
    event_type text NOT NULL, -- 'visit', 'click_whatsapp', 'form_submit'
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now()
);

-- 4. Partner Applications
CREATE TABLE IF NOT EXISTS public.truscan_partner_applications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    email text NOT NULL,
    whatsapp text NOT NULL,
    experience text,
    status text DEFAULT 'pending', -- 'pending', 'approved', 'declined'
    created_at timestamp with time zone DEFAULT now()
);

-- 5. Sessions Table (Secure Auth)
CREATE TABLE IF NOT EXISTS public.truscan_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL, -- 'admin' or agent_code
    type text NOT NULL, -- 'admin' or 'agent'
    expires_at timestamp with time zone NOT NULL,
    whatsapp text,
    created_at timestamp with time zone DEFAULT now()
);

-- 6. OTPs Table (To support serverless/Vercel)
CREATE TABLE IF NOT EXISTS public.truscan_otps (
    whatsapp text PRIMARY KEY,
    otp text NOT NULL,
    expires bigint NOT NULL,
    type text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security (RLS)
-- For a production app, you should define specific policies.
-- For now, we'll enable it but you'll need to configure policies in the Supabase UI
-- or add them here.

ALTER TABLE public.truscan_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.truscan_funnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.truscan_agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.truscan_partner_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.truscan_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.truscan_otps ENABLE ROW LEVEL SECURITY;

-- Simple "Service Role" or "Anon" policies can be added here if needed,
-- but usually it's better to use the Supabase UI for fine-grained control.
