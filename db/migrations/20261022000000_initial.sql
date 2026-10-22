-- migrate:up
CREATE TABLE polydays_documents (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL,
  kind ENUM('calendar','task','series') NOT NULL,
  body JSON NOT NULL,
  revision INTEGER NOT NULL,
  PRIMARY KEY (user_id, id)
);
CREATE TABLE polydays_changes (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  body JSON NOT NULL
);
CREATE INDEX polydays_changes_user_seq ON polydays_changes(user_id, seq);
CREATE TABLE polydays_operations (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL,
  result JSON NOT NULL,
  PRIMARY KEY (user_id, id)
);
CREATE TABLE polydays_schedule_slots (
  user_id TEXT NOT NULL,
  version_id TEXT NOT NULL,
  slot_id TEXT NOT NULL,
  effective_date DATE NOT NULL,
  name TEXT NOT NULL,
  starts_at TIME NOT NULL,
  ends_at TIME NOT NULL,
  time_zone TEXT NOT NULL,
  PRIMARY KEY (user_id, version_id, slot_id)
);

-- migrate:down
DROP TABLE polydays_schedule_slots;
DROP TABLE polydays_operations;
DROP TABLE polydays_changes;
DROP TABLE polydays_documents;
