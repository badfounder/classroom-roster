-- Tables in the "tables" layout can now carry a custom name + description
-- (e.g. team names, project topics). seat_groups holds the per-table metadata
-- and each seat_slot optionally points at one. group_index lets us preserve
-- the T1/T2/... ordering even when the teacher renames a table.

CREATE TABLE seat_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes (id) ON DELETE CASCADE,
  group_index int NOT NULL,
  name text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT seat_groups_unique_index_per_class UNIQUE (class_id, group_index)
);

CREATE INDEX idx_seat_groups_class ON seat_groups (class_id);

ALTER TABLE seat_slots
  ADD COLUMN group_id uuid REFERENCES seat_groups (id) ON DELETE SET NULL;

CREATE INDEX idx_seat_slots_group ON seat_slots (group_id);
