-- Add username column to conversations table
ALTER TABLE conversations ADD COLUMN username TEXT;

-- Create index for faster username-based queries
CREATE INDEX idx_conversations_username ON conversations(username);
