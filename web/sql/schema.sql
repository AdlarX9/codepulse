-- Schéma MySQL pour le site web CodePulse

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS download_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    platform ENUM('mac', 'win', 'linux') NOT NULL,
    ip VARCHAR(64) NULL,
    user_agent VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB;

-- Compteur agrégé par plateforme
CREATE TABLE IF NOT EXISTS download_counts (
    platform ENUM('mac', 'win', 'linux') PRIMARY KEY,
    count BIGINT NOT NULL DEFAULT 0
) ENGINE = InnoDB;

INSERT IGNORE INTO download_counts (platform, count)
VALUES ('mac', 0),
    ('win', 0),
    ('linux', 0);