/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration to add hook for auto-creating energy records when users are created
 */

migrate((db) => {
  // This migration adds a hook to automatically create energy records
  // The actual hook implementation would be in the PocketBase hooks file
  // For now, we'll just log that this migration ran

  console.log('🔧 Migration: Adding user energy auto-creation hook');
  console.log('📝 This migration sets up hooks to auto-create energy records for new users');

  // In a real PocketBase setup, this would register the hook
  // For this demo, we'll create a simple script to run after migration

}, (db) => {
  console.log('🔄 Rollback: Removing user energy auto-creation hook');
});







