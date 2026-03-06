ALTER TABLE knowledge_chunks
  ADD COLUMN IF NOT EXISTS related_course_id VARCHAR(36),
  ADD COLUMN IF NOT EXISTS related_lesson_id VARCHAR(36);
