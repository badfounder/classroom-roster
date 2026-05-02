-- Allow teacher-created rows; flag survey submissions that need teacher review.

ALTER TABLE students DROP CONSTRAINT IF EXISTS students_source_check;

ALTER TABLE students ADD CONSTRAINT students_source_check
  CHECK (source IN ('survey', 'csv', 'manual'));

ALTER TABLE students ADD COLUMN IF NOT EXISTS submission_review text;

ALTER TABLE students DROP CONSTRAINT IF EXISTS students_submission_review_check;

ALTER TABLE students ADD CONSTRAINT students_submission_review_check
  CHECK (
    submission_review IS NULL
    OR submission_review IN ('no_roster_match', 'ambiguous_roster_match')
  );

CREATE INDEX IF NOT EXISTS idx_students_edit_token_hash
  ON students (edit_token_hash)
  WHERE edit_token_hash IS NOT NULL;
