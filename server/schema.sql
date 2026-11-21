-- Compatível com MySQL 5.7, InnoDB e utf8mb4.
CREATE TABLE IF NOT EXISTS emave_backups (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  device_id VARCHAR(100) NOT NULL,
  revision BIGINT UNSIGNED NOT NULL,
  digest CHAR(64) NOT NULL,
  envelope LONGBLOB NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  emailed_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_revision (device_id,revision),
  KEY idx_latest (id),
  KEY idx_emailed (emailed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
