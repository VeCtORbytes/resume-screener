-- Migration 001: Create screening_sessions and resume_results tables

CREATE TABLE screening_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  result_count INT DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_screening_created_at ON screening_sessions(created_at DESC);
CREATE INDEX idx_screening_expires_at ON screening_sessions(expires_at);

ALTER TABLE screening_sessions ENABLE ROW LEVEL SECURITY;

CREATE TABLE resume_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screening_id UUID NOT NULL REFERENCES screening_sessions(id) ON DELETE CASCADE,
  resume_filename VARCHAR(255) NOT NULL,
  resume_text TEXT NOT NULL,
  score INT NOT NULL CHECK (score >= 0 AND score <= 100),
  reasoning TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_screening_id ON resume_results(screening_id);
CREATE INDEX idx_score ON resume_results(score DESC);
CREATE INDEX idx_expires_at ON resume_results(expires_at);
CREATE INDEX idx_created_at ON resume_results(created_at DESC);

ALTER TABLE resume_results ENABLE ROW LEVEL SECURITY;