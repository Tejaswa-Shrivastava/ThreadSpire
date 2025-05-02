# Database Setup Guide

## PostgreSQL Setup

ThreadSpire uses PostgreSQL for data storage. Here's how to set it up:

### Local Development

1. Install PostgreSQL on your machine
2. Create a new database
   ```sql
   CREATE DATABASE threadspire;
   ```
3. Create a user with password
   ```sql
   CREATE USER threadspire_user WITH PASSWORD 'your_password';
   ```
4. Grant privileges to the user
   ```sql
   GRANT ALL PRIVILEGES ON DATABASE threadspire TO threadspire_user;
   ```
5. Set up your environment variables
   ```
   DATABASE_URL=postgresql://threadspire_user:your_password@localhost:5432/threadspire
   ```

### Using Neon or Other PostgreSQL Providers

1. Create an account at a PostgreSQL provider like [Neon](https://neon.tech/) or [Supabase](https://supabase.io/)
2. Create a new PostgreSQL database
3. Get the connection string from the provider
4. Add it to your environment variables:
   ```
   DATABASE_URL=postgresql://username:password@hostname:port/database
   ```
   
## Database Schema

The application uses Drizzle ORM to define and manage the database schema. The schema is defined in `shared/schema.ts`.

## Database Migration

To update your database schema:

```bash
npm run db:push
```

This will apply all schema changes to your connected database.

## Initial Data Setup

The application automatically initializes the database with some basic reaction types when first started.