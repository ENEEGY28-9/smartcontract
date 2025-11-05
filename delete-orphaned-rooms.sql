-- Delete orphaned rooms that have non-existent owners
-- This script should be run in PocketBase's database console or SQLite browser

-- First, verify these rooms exist and their owners don't exist in users table
-- SELECT r.id, r.name, r.owner_id, r.created
-- FROM rooms r
-- LEFT JOIN users u ON r.owner_id = u.id
-- WHERE u.id IS NULL;

-- Delete the orphaned rooms
DELETE FROM rooms
WHERE id IN ('7msp0tssxvpcytt', 'q5l8dt8dfy2lqds')
AND owner_id NOT IN (SELECT id FROM users);

-- Verify deletion
-- SELECT COUNT(*) as remaining_orphaned_rooms
-- FROM rooms r
-- LEFT JOIN users u ON r.owner_id = u.id
-- WHERE u.id IS NULL;
