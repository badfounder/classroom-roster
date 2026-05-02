-- Classroom roster — initial schema (see project.md)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES teachers (id) ON DELETE CASCADE,
  name text NOT NULL,
  class_code text NOT NULL UNIQUE,
  classroom_photo_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER classes_set_updated_at
  BEFORE UPDATE ON classes
  FOR EACH ROW
  EXECUTE PROCEDURE set_updated_at();

CREATE TABLE students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes (id) ON DELETE CASCADE,
  legal_name text NOT NULL,
  preferred_name text,
  phonetic_spelling text,
  pronouns text,
  fun_fact text,
  photo_path text,
  edit_token_hash text,
  consent_confirmed_at timestamptz,
  survey_submitted_at timestamptz,
  source text NOT NULL DEFAULT 'survey',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT students_source_check CHECK (source IN ('survey', 'csv'))
);

CREATE TRIGGER students_set_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW
  EXECUTE PROCEDURE set_updated_at();

CREATE INDEX idx_students_class_legal_normalized
  ON students (class_id, lower(trim(legal_name)));

CREATE TABLE seating_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes (id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students (id) ON DELETE CASCADE,
  x numeric(5, 2) NOT NULL,
  y numeric(5, 2) NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT seating_positions_xy_range CHECK (
    x >= 0 AND x <= 100 AND y >= 0 AND y <= 100
  ),
  CONSTRAINT seating_positions_unique_student_per_class UNIQUE (class_id, student_id)
);

CREATE TRIGGER seating_positions_set_updated_at
  BEFORE UPDATE ON seating_positions
  FOR EACH ROW
  EXECUTE PROCEDURE set_updated_at();
