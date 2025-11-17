-- sql/schema.sql

CREATE TABLE IF NOT EXISTS tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(200),
  user_id VARCHAR(100),
  phone VARCHAR(50),
  incident_type VARCHAR(100),
  sub_type VARCHAR(100),
  description TEXT,
  category VARCHAR(50),
  priority INT,
  resolution_hours INT,
  resolution_time VARCHAR(100),
  sla_target VARCHAR(255),
  status VARCHAR(50) DEFAULT 'open',
  created_at DATETIME,
  closed_at DATETIME NULL,
  reporter_telegram_id BIGINT NULL
);

CREATE TABLE IF NOT EXISTS evidences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT,
  file_id VARCHAR(255),
  file_type VARCHAR(50),
  created_at DATETIME,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
);
