CREATE TABLE IF NOT EXISTS days (
  id TEXT PRIMARY KEY,            -- 2026-11-19
  sleep_hours REAL,
  sleep_note TEXT,
  walk_km REAL,
  walk_kcal INTEGER,
  done INTEGER DEFAULT 0,
  notes TEXT                      -- JSON array of strings
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day_id TEXT NOT NULL,
  time TEXT,                      -- "7:30 am" or "After breakfast"
  type TEXT NOT NULL,             -- 'w' water, 's' sleep, 'a' activity, 'm' meal
  ml INTEGER,
  text TEXT,
  meal_id INTEGER
);
CREATE TABLE IF NOT EXISTS meals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day_id TEXT NOT NULL,
  time TEXT,
  slot TEXT,                      -- Breakfast, Lunch, Snack, Dinner
  name TEXT,
  protein REAL,
  carbs REAL,
  fat REAL
);
CREATE TABLE IF NOT EXISTS meal_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meal_id INTEGER NOT NULL,
  name TEXT,
  portion TEXT,
  kcal INTEGER,
  protein REAL
);
CREATE INDEX IF NOT EXISTS idx_events_day ON events(day_id);
CREATE INDEX IF NOT EXISTS idx_meals_day ON meals(day_id);
