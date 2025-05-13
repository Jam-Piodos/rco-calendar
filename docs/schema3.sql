-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create clubs table (this will be the main table with club and leader info combined)
CREATE TABLE clubs (
    club_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    club_name TEXT NOT NULL UNIQUE,
    club_description TEXT,
    club_logo_url TEXT,
    club_category TEXT,
    club_status TEXT DEFAULT 'active' CHECK (club_status IN ('active', 'inactive', 'pending')),
    -- Leader information
    leader_email TEXT NOT NULL UNIQUE,
    leader_password TEXT NOT NULL,
    leader_name TEXT NOT NULL,
    leader_position TEXT NOT NULL,
    leader_contact TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Clubs are viewable by everyone"
    ON clubs FOR SELECT
    USING (true);

CREATE POLICY "Clubs can be created by anyone with valid email"
    ON clubs FOR INSERT
    WITH CHECK (leader_email LIKE '%@nbsc.edu.ph');

CREATE POLICY "Clubs can be updated by their own leader"
    ON clubs FOR UPDATE
    USING (leader_email = auth.email());

-- Create function to handle club updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updating the updated_at column
CREATE TRIGGER update_clubs_updated_at
    BEFORE UPDATE ON clubs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();