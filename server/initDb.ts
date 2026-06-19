import { pool } from "./db";

export async function initializeDatabase(): Promise<void> {
  const client = await pool.connect();
  try {

    // ─── Core tables ──────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        join_date TIMESTAMP DEFAULT NOW(),
        views INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        max_tracks INTEGER DEFAULT 3,
        max_tags INTEGER DEFAULT 5,
        badges JSONB DEFAULT '[]',
        hidden_badges JSONB DEFAULT '[]',
        is_premium BOOLEAN DEFAULT false,
        premium_expiry TIMESTAMP,
        alias TEXT,
        max_aliases INTEGER DEFAULT 1,
        aliases JSONB DEFAULT '[]',
        discord_id TEXT,
        discord_avatar TEXT,
        discord_username TEXT,
        easter_egg_claimed BOOLEAN DEFAULT false,
        daily_streak INTEGER DEFAULT 0,
        last_daily_claim TIMESTAMP,
        completed_challenges JSONB DEFAULT '[]',
        last_wheel_spin TIMESTAMP,
        profile_setup_done BOOLEAN DEFAULT false,
        last_seen_at TIMESTAMP DEFAULT NOW(),
        bonus_likes INTEGER DEFAULT 0,
        user_status TEXT DEFAULT 'active',
        presence_status TEXT DEFAULT 'offline',
        hidden_badges_v2 JSONB DEFAULT '[]'
      );

      CREATE TABLE IF NOT EXISTS profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        display_name TEXT DEFAULT '',
        bio TEXT DEFAULT '',
        location TEXT DEFAULT '',
        avatar_url TEXT,
        banner_url TEXT,
        background_url TEXT,
        background_video_url TEXT,
        music_url TEXT,
        show_views BOOLEAN DEFAULT true,
        show_uid BOOLEAN DEFAULT true,
        show_join_date BOOLEAN DEFAULT true,
        show_watermark BOOLEAN DEFAULT true,
        theme_color TEXT DEFAULT '#F97316',
        background_effect TEXT DEFAULT 'none',
        reveal_enabled BOOLEAN DEFAULT true,
        reveal_text TEXT DEFAULT 'Click to reveal',
        settings JSONB DEFAULT '{}'
      );

      CREATE TABLE IF NOT EXISTS badges (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        icon TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#F97316',
        is_protected BOOLEAN DEFAULT false,
        description TEXT DEFAULT '',
        how_to_get TEXT DEFAULT '',
        visible_to TEXT DEFAULT 'all'
      );

      CREATE TABLE IF NOT EXISTS links (
        id SERIAL PRIMARY KEY,
        profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        description TEXT DEFAULT '',
        icon TEXT DEFAULT '',
        platform TEXT DEFAULT '',
        style TEXT DEFAULT 'default',
        "order" INTEGER DEFAULT 0,
        enabled BOOLEAN DEFAULT true,
        clicks INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS tracks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        artist_profile TEXT DEFAULT '',
        "order" INTEGER DEFAULT 0,
        enabled INTEGER DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS view_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        ip_address TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS profile_likes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        ip_address TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, ip_address)
      );

      CREATE TABLE IF NOT EXISTS session (
        sid TEXT NOT NULL PRIMARY KEY,
        sess JSON NOT NULL,
        expire TIMESTAMP NOT NULL
      );

      CREATE INDEX IF NOT EXISTS session_expire_idx ON session (expire);
    `);

    // ─── Discord / OAuth events ───────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS discord_events (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        discord_id TEXT NOT NULL,
        discord_username TEXT,
        discord_global_name TEXT,
        email TEXT,
        action TEXT NOT NULL DEFAULT 'login',
        is_new_user BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // ─── Templates ────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS templates (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        username TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        preview_image_url TEXT,
        profile_snapshot JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        uses INTEGER DEFAULT 0,
        favorites INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS template_favorites (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, template_id)
      );
    `);

    // ─── Tickets ──────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        discord_id TEXT,
        discord_username TEXT,
        discord_avatar TEXT,
        status TEXT NOT NULL DEFAULT 'open',
        claimed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        claimed_by_discord_username TEXT,
        claimed_by_discord_avatar TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ticket_messages (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        sender_type TEXT NOT NULL DEFAULT 'user',
        sender_name TEXT,
        sender_avatar TEXT,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // ─── Bot / announcements / webhooks ───────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS bot_settings (
        id SERIAL PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL DEFAULT '',
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS announcements (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT DEFAULT '',
        type TEXT NOT NULL DEFAULT 'info',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS webhooks (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        webhook_url TEXT NOT NULL,
        log_type TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // ─── Website status / changelog / our-team ────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS website_status (
        id SERIAL PRIMARY KEY,
        status TEXT NOT NULL DEFAULT 'up',
        reason TEXT DEFAULT '',
        by_name TEXT DEFAULT '',
        by_rank TEXT DEFAULT '',
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS changelogs (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS our_team (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        avatar TEXT DEFAULT '',
        discord TEXT DEFAULT '',
        "order" INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // ─── Uploads ──────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS uploads (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        username TEXT,
        file_name TEXT,
        content_type TEXT,
        object_path TEXT,
        public_url TEXT,
        uploaded_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // ─── Shop / orders ────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        price REAL NOT NULL DEFAULT 0,
        sale_price REAL,
        icon TEXT NOT NULL DEFAULT '📦',
        image_url TEXT,
        features JSONB NOT NULL DEFAULT '[]',
        badge_name TEXT,
        grants_premium BOOLEAN DEFAULT false,
        color TEXT DEFAULT '#F97316',
        bg_color TEXT DEFAULT '#0d0d0d',
        sort_order INTEGER DEFAULT 0,
        is_seeded BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        product_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        price REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'completed',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS profile_decorations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        media_type TEXT NOT NULL DEFAULT 'image',
        is_premium_only BOOLEAN DEFAULT false,
        enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // ─── Idempotent column migrations (safe to run every boot) ───────────────
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS alias TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS max_aliases INTEGER DEFAULT 1;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_id TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_avatar TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_username TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS easter_egg_claimed BOOLEAN DEFAULT false;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_streak INTEGER DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_daily_claim TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS aliases JSONB DEFAULT '[]';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS hidden_badges JSONB DEFAULT '[]';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS completed_challenges JSONB DEFAULT '[]';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_wheel_spin TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_setup_done BOOLEAN DEFAULT false;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP DEFAULT NOW();
      ALTER TABLE users ADD COLUMN IF NOT EXISTS bonus_likes INTEGER DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS user_status TEXT DEFAULT 'active';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS presence_status TEXT DEFAULT 'offline';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_code TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false;

      ALTER TABLE badges ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
      ALTER TABLE badges ADD COLUMN IF NOT EXISTS how_to_get TEXT DEFAULT '';
      ALTER TABLE badges ADD COLUMN IF NOT EXISTS visible_to TEXT DEFAULT 'all';

      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS background_video_url TEXT;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reveal_enabled BOOLEAN DEFAULT true;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reveal_text TEXT DEFAULT 'Click to reveal';

      ALTER TABLE tracks ADD COLUMN IF NOT EXISTS enabled INTEGER DEFAULT 1;
      ALTER TABLE tracks ADD COLUMN IF NOT EXISTS artist_profile TEXT DEFAULT '';

      ALTER TABLE links ADD COLUMN IF NOT EXISTS clicks INTEGER DEFAULT 0;
      ALTER TABLE links ADD COLUMN IF NOT EXISTS style TEXT DEFAULT 'default';
      ALTER TABLE links ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT '';

      ALTER TABLE templates ADD COLUMN IF NOT EXISTS favorites INTEGER DEFAULT 0;

      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS discord_avatar TEXT;
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS claimed_by_discord_avatar TEXT;
    `);

    // Auto-migrate existing users to have profile_setup_done = true
    await client.query(`
      UPDATE users SET profile_setup_done = true
      WHERE profile_setup_done IS NULL OR (profile_setup_done = false AND created_at < NOW() - INTERVAL '1 minute');
    `);

    console.log("[db] All tables initialized successfully");
  } finally {
    client.release();
  }
}
