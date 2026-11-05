-- ==============================================================================
-- MOBILE REPAIR TRACKING & INVENTORY MANAGEMENT SYSTEM
-- PostgreSQL / Supabase Database Schema, Indexes, Constraints & Row Level Security
-- Timezone: Asia/Kolkata (UTC +05:30)
-- ==============================================================================

-- 1. PROFILES TABLE (Linked with Supabase Auth Users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'technician')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Kolkata'::text, now())
);

-- 2. PICKUP BATCHES TABLE
-- Represents a single intake batch brought by the technician with 1 mandatory batch image
CREATE TABLE IF NOT EXISTS public.pickup_batches (
    id TEXT PRIMARY KEY, -- e.g. PB-20261105-XXXX
    pickup_date DATE NOT NULL,
    pickup_time TEXT,
    pickup_image_url TEXT NOT NULL,
    technician_id UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Kolkata'::text, now())
);

-- 3. RETURN BATCHES TABLE
-- Represents a single completion return batch with 1 mandatory return image showing all returned phones
CREATE TABLE IF NOT EXISTS public.return_batches (
    id TEXT PRIMARY KEY, -- e.g. RB-20261105-XXXX
    return_date DATE NOT NULL,
    return_time TEXT,
    return_image_url TEXT NOT NULL,
    technician_id UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Kolkata'::text, now())
);

-- 4. REPAIR ITEMS TABLE
-- Each phone has its own unique Repair Item ID (e.g. REP-1001)
CREATE TABLE IF NOT EXISTS public.repair_items (
    id TEXT PRIMARY KEY, -- Unique Repair Item ID
    pickup_batch_id TEXT NOT NULL REFERENCES public.pickup_batches(id) ON DELETE RESTRICT,
    model_name TEXT NOT NULL,
    repair_reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    pickup_date DATE NOT NULL,
    completion_date DATE,
    return_batch_id TEXT REFERENCES public.return_batches(id) ON DELETE RESTRICT,
    technician_id UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Kolkata'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Kolkata'::text, now())
);

-- 5. REPAIR HISTORY TABLE (Audit Log)
CREATE TABLE IF NOT EXISTS public.repair_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repair_item_id TEXT NOT NULL REFERENCES public.repair_items(id) ON DELETE CASCADE,
    previous_status TEXT NOT NULL,
    new_status TEXT NOT NULL,
    event_date TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Kolkata'::text, now()),
    performed_by UUID NOT NULL REFERENCES public.profiles(id),
    notes TEXT
);

-- ==============================================================================
-- INDEXES FOR MAXIMUM SCAN SPEED & FILTERING
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_repair_items_status ON public.repair_items(status);
CREATE INDEX IF NOT EXISTS idx_repair_items_pickup_date ON public.repair_items(pickup_date);
CREATE INDEX IF NOT EXISTS idx_repair_items_completion_date ON public.repair_items(completion_date);
CREATE INDEX IF NOT EXISTS idx_repair_items_model ON public.repair_items(model_name);
CREATE INDEX IF NOT EXISTS idx_repair_items_pickup_batch ON public.repair_items(pickup_batch_id);
CREATE INDEX IF NOT EXISTS idx_repair_items_return_batch ON public.repair_items(return_batch_id);
CREATE INDEX IF NOT EXISTS idx_repair_history_item ON public.repair_history(repair_item_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_history ENABLE ROW LEVEL SECURITY;

-- Helper function to check current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- PROFILES POLICIES
CREATE POLICY "Users can read all profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

-- PICKUP BATCHES POLICIES
CREATE POLICY "Authenticated users can view pickup batches"
    ON public.pickup_batches FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Only technicians can create pickup batches"
    ON public.pickup_batches FOR INSERT
    TO authenticated
    WITH CHECK (public.get_current_user_role() = 'technician');

-- RETURN BATCHES POLICIES
CREATE POLICY "Authenticated users can view return batches"
    ON public.return_batches FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Only technicians can create return batches"
    ON public.return_batches FOR INSERT
    TO authenticated
    WITH CHECK (public.get_current_user_role() = 'technician');

-- REPAIR ITEMS POLICIES
CREATE POLICY "Authenticated users can view repair items"
    ON public.repair_items FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Technicians can insert repair items"
    ON public.repair_items FOR INSERT
    TO authenticated
    WITH CHECK (public.get_current_user_role() = 'technician');

CREATE POLICY "Technicians can update repair items to complete"
    ON public.repair_items FOR UPDATE
    TO authenticated
    USING (public.get_current_user_role() = 'technician');

-- REPAIR HISTORY POLICIES
CREATE POLICY "Authenticated users can view repair history"
    ON public.repair_history FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert repair history"
    ON public.repair_history FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- ==============================================================================
-- STORAGE BUCKET CONFIGURATION (Run in Supabase SQL editor)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('repair-images', 'repair-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow public read of repair images" 
    ON storage.objects FOR SELECT 
    USING (bucket_id = 'repair-images');

CREATE POLICY "Allow authenticated technicians to upload repair images" 
    ON storage.objects FOR INSERT 
    TO authenticated 
    WITH CHECK (bucket_id = 'repair-images');

