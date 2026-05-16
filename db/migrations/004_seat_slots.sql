-- Physical seat positions on the classroom photo. Teachers either place these
-- by clicking on the canvas in "Edit seats" mode, or generate them with the
-- AI seat-detection action which calls a vision model against the uploaded
-- classroom photo.

CREATE TABLE seat_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes (id) ON DELETE CASCADE,
  x numeric(5, 2) NOT NULL,
  y numeric(5, 2) NOT NULL,
  label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT seat_slots_xy_range CHECK (
    x >= 0 AND x <= 100 AND y >= 0 AND y <= 100
  )
);

CREATE INDEX idx_seat_slots_class ON seat_slots (class_id);
