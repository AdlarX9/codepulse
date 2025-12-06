# CodePulse Web (PHP)

Site de landing en PHP natif, sans framework frontend. Fournit:
- `GET /download?platform=mac|win|linux` — Téléchargement (simulé) et journalisation
- `GET /stats` — Affiche les stats de téléchargement (protégé)
- `POST /auth/login` et `GET /auth/logout` — Authentification pour accéder aux stats

Base de données: MySQL via PDO.

## Configuration

Créez le fichier `.env` dans `web/` (voir `.env.example`).

```
DB_HOST=localhost
DB_PORT=3306
DB_NAME=codepulse
DB_USER=codepulse
DB_PASS=secret
SESSION_SECRET=change-me
ADMIN_USER=admin
ADMIN_PASS=very-strong-password
DOWNLOAD_BASE_URL=https://downloads.codepulse.app/
```

## Schéma MySQL

Exécutez `sql/schema.sql` dans votre MySQL.

## Démarrage local

Avec PHP intégré:

```
php -S 127.0.0.1:8080 -t web
```

Puis ouvrez `http://127.0.0.1:8080/index.php`.
