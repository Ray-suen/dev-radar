CREATE TABLE issues (
  date TEXT PRIMARY KEY
);

CREATE TABLE articles (
  id TEXT PRIMARY KEY,
  issue_date TEXT NOT NULL REFERENCES issues(date) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position BETWEEN 1 AND 3),
  title TEXT NOT NULL,
  original_title TEXT NOT NULL,
  category TEXT NOT NULL,
  source TEXT NOT NULL,
  published_at TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  project_url TEXT,
  discussion_url TEXT,
  summary TEXT NOT NULL,
  details TEXT NOT NULL,
  UNIQUE (issue_date, position)
);

CREATE INDEX articles_issue_date_idx ON articles(issue_date DESC, position ASC);

CREATE TABLE heat_metrics (
  id INTEGER PRIMARY KEY,
  article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  metric TEXT NOT NULL,
  value REAL NOT NULL CHECK (value >= 0),
  source_url TEXT NOT NULL,
  checked_at TEXT NOT NULL
);

CREATE INDEX heat_metrics_article_id_idx ON heat_metrics(article_id);
