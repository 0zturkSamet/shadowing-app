# Database Migrations

This directory contains SQL migration scripts for the ShadowSpeak database.

## Automatic Table Creation

The application uses SQLAlchemy's automatic table creation feature. When you start the application, it will automatically create all tables defined in the models.

**New tables added:**
- `video_progress`: Tracks user video playback progress
- `phrase_attempts`: Records phrase practice attempts

## Manual Migration

If you need to run migrations manually (e.g., in production), execute the SQL scripts in order:

```bash
# Connect to your PostgreSQL database
psql -U your_username -d shadowspeak_db -f migrations/001_add_video_progress_and_phrase_attempts.sql
```

## Migration Files

- `001_add_video_progress_and_phrase_attempts.sql`: Adds video progress tracking and phrase attempt tables

## Creating New Migrations

When adding new tables or modifying schema:

1. Update the models in `app/models.py`
2. Create a new numbered SQL file in this directory
3. Document the changes in this README
4. Test the migration on a development database

## Notes

- The application will automatically create tables on startup
- Manual migrations are provided for production environments
- Always backup your database before running migrations
