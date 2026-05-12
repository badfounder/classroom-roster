-- College-friendly survey: replace single fun-fact prompt with a handful of
-- light, optional Q&A prompts, and store an optional audio recording of the
-- student saying their own name.

ALTER TABLE students ADD COLUMN IF NOT EXISTS hometown text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS major text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS favorite_food text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS weekend_activity text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS superpower text;

-- UUID-based filename of the student saying their own name. Served via the
-- authenticated /api/uploads/[...path] route, same as photos.
ALTER TABLE students ADD COLUMN IF NOT EXISTS name_audio_path text;
