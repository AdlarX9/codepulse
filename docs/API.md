# 🔌 API Reference - CodePulse

Documentation complète de l'API CodePulse.

## Vue d'Ensemble

L'API CodePulse fournit des endpoints pour :
- **Tracking de téléchargements** avec analytics anonymes
- **Export de données** de projets en CSV/JSON/XML
- **Dashboard admin** avec statistiques d'utilisation
- **Intégration GitHub** pour releases automatisées

## Base URL

```
https://codepulse.app/api
```

## Authentification

### Admin Authentication

La plupart des endpoints admin nécessitent une authentification HTTP Basic Auth :

```bash
curl -u "admin:votre-mot-de-passe" https://codepulse.app/api/admin/stats
```

Les credentials sont configurés via les variables d'environnement :
- `NEXT_ADMIN_USER` : Nom d'utilisateur admin
- `NEXT_ADMIN_PASS` : Mot de passe admin

## Endpoints

---

## 📥 Download API

Gestion des téléchargements avec tracking analytique.

### `GET /api/download`

Redirige vers les assets de téléchargement selon la plateforme tout en collectant des analytics anonymes.

**Paramètres de requête :**
- `platform` (requis) : `mac`, `win`, ou `linux`
- `version` (optionnel) : Tag de version, défaut : `latest`

**Headers ajoutés automatiquement :**
- `x-real-ip` : Adresse IP utilisateur
- `x-forwarded-for` : IP proxy si applicable
- `x-vercel-ip-country` : Code pays (ISO 3166-1 alpha-2)
- `x-vercel-ip-city` : Nom de la ville
- `user-agent` : User agent du client
- `referer` : URL référente

**Réponse :** `302 Redirect` vers l'URL de l'asset

**Données Analytics Collectées :**
```sql
downloads {
  ip_hash        -- SHA-256 de l'IP + salt
  country        -- Code pays ISO
  region         -- Région géographique
  city          -- Ville
  user_agent    -- Client navigateur
  referrer      -- URL référente
  platform      -- mac/win/linux
  version       -- Tag de version
  created_at    -- Timestamp
}
```

**Exemple :**
```bash
curl "https://codepulse.app/api/download?platform=mac&version=v1.0.0"
# → 302 vers le fichier DMG actuel
```

---

## 📊 Export API

Export des données de scan de projets.

### `GET /api/export`

Exporte les données de scan d'un projet avec filtrage optionnel.

**Authentification :** Requise (Admin)

**Paramètres de requête :**
- `project_id` (requis) : UUID du projet
- `format` (requis) : Format d'export (`csv`, `json`, `xml`)
- `from` (optionnel) : Date de début (ISO 8601)
- `to` (optionnel) : Date de fin (ISO 8601)
- `include_languages` (optionnel) : Inclure répartition langues (`true`/`false`)

### Formats de Réponse

#### CSV
```csv
scan_id,created_at,total_lines,code_lines,comment_lines,blank_lines,core_code_lines,info_lines,comment_ratio,device_id,version
123e4567-e89b-12d3-a456-426614174000,2024-01-15T10:30:00Z,15420,8934,2341,5145,7850,1084,0.15,device-abc,1.2.3
```

#### JSON
```json
{
  "codepulse_export": {
    "project": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Mon Projet",
      "exported_at": "2024-01-15T10:30:00Z"
    },
    "scans": [
      {
        "id": "scan-uuid",
        "created_at": "2024-01-15T10:30:00Z",
        "total": 15420,
        "code": 8934,
        "comment": 2341,
        "blank": 5145,
        "core_code_lines": 7850,
        "info_lines": 1084,
        "comment_ratio": 0.15,
        "device_id": "device-abc",
        "version_tag": "1.2.3",
        "scan_langs": [
          {
            "language": "typescript",
            "lines": 5420,
            "percentage": 35.1
          }
        ]
      }
    ]
  }
}
```

#### XML
```xml
<?xml version="1.0" encoding="UTF-8"?>
<codepulse_export>
  <project>
    <id>123e4567-e89b-12d3-a456-426614174000</id>
    <name>Mon Projet</name>
    <exported_at>2024-01-15T10:30:00Z</exported_at>
  </project>
  <scans>
    <id>scan-uuid</id>
    <created_at>2024-01-15T10:30:00Z</created_at>
    <total>15420</total>
    <code>8934</code>
    <!-- autres champs -->
  </scans>
</codepulse_export>
```

**Codes d'erreur :**
- `400` : Paramètres invalides
- `404` : Projet non trouvé
- `500` : Erreur serveur

---

## 📈 Admin Stats API

Statistiques pour le dashboard admin.

### `GET /api/admin/stats`

Récupère les statistiques complètes de téléchargement et d'utilisation.

**Authentification :** Requise (Admin)

**Paramètres de requête :**
- `period` (optionnel) : Période (`day`, `week`, `month`, `year`) - défaut : `month`
- `format` (optionnel) : Format réponse (`json`, `csv`) - défaut : `json`

**Réponse JSON :**
```json
{
  "downloads": {
    "total": 15420,
    "by_platform": {
      "mac": 8934,
      "win": 4123,
      "linux": 2363
    },
    "by_country": {
      "US": 5420,
      "DE": 3210,
      "FR": 2150,
      "GB": 1890,
      "CA": 1750
    },
    "trend": [
      {"date": "2024-01-01", "downloads": 45},
      {"date": "2024-01-02", "downloads": 52}
    ]
  },
  "projects": {
    "total": 23,
    "active": 18,
    "total_scans": 1456
  },
  "versions": {
    "latest": "1.2.3",
    "distribution": {
      "1.2.3": 8934,
      "1.2.2": 4123,
      "1.2.1": 2363
    }
  }
}
```

---

## 🔗 GitHub Integration API

Gestion des webhooks GitHub et releases.

### `POST /api/github/webhook`

Traite les événements webhook GitHub pour les releases automatisées.

**Authentification :** Vérification de signature GitHub

**Headers :**
- `X-GitHub-Event` : Type d'événement (`release`, `push`, etc.)
- `X-Hub-Signature-256` : Signature SHA-256 pour vérification

**Corps de la requête :**
```json
{
  "action": "published",
  "release": {
    "tag_name": "v1.2.3",
    "name": "Release v1.2.3",
    "assets": [
      {
        "name": "CodePulse-1.2.3.dmg",
        "browser_download_url": "https://github.com/user/repo/releases/download/v1.2.3/CodePulse-1.2.3.dmg"
      }
    ]
  }
}
```

**Réponse :**
- `200` : Webhook traité avec succès
- `400` : Signature ou payload invalide
- `500` : Erreur interne

---

## Modèles de Données

### Structure de Scan

```typescript
interface Scan {
  id: string
  project_id: string
  created_at: string
  total: number           // Lignes totales
  code: number           // Lignes de code
  comment: number        // Lignes de commentaire
  blank: number          // Lignes vides
  core_code_lines: number // Lignes de code (tests/docs exclus)
  info_lines: number     // Lignes de documentation
  comment_ratio: number  // Ratio commentaires
  device_id: string      // Identifiant appareil anonyme
  version_tag: string    // Version de l'app utilisée
}
```

### Répartition par Langage

```typescript
interface ScanLanguage {
  scan_id: string
  language: string
  lines: number
  percentage: number
  files: number
}
```

### Analytics de Téléchargement

```typescript
interface Download {
  id: string
  ip_hash: string        // SHA-256 de l'IP + salt
  country: string        // Code pays ISO
  region: string         // Région géographique
  city: string          // Nom de la ville
  user_agent: string     // User agent client
  referrer: string       // URL référente
  platform: 'mac' | 'win' | 'linux'
  version: string        // Tag de version
  created_at: string     // Timestamp
}
```

## Gestion d'Erreurs

Tous les endpoints suivent les codes HTTP standards :

- `200` : Succès
- `302` : Redirection (endpoint download)
- `400` : Mauvaise requête (paramètres invalides)
- `401` : Non autorisé (auth manquante/invalide)
- `404` : Non trouvé (ressource inexistante)
- `500` : Erreur serveur interne

Réponses d'erreur avec corps JSON :
```json
{
  "error": "Description de l'erreur",
  "details": "Contexte additionnel"
}
```

## Sécurité et Confidentialité

- **Anonymisation IP** : Toutes les IPs sont hashées avec un salt
- **Pas de données personnelles** : Seules les régions géographiques sont conservées
- **HTTPS obligatoire** : Toutes les requêtes doivent utiliser HTTPS
- **CORS** : Configuré pour l'accès dashboard uniquement
- **Rate Limiting** : 100 requêtes/minute par IP pour les endpoints admin

## Technologies Utilisées

- **Next.js API Routes** : Runtime Edge Functions
- **Supabase** : Base PostgreSQL avec Row Level Security
- **Papa Parse** : Génération CSV
- **xml-js** : Conversion XML
- **Zod** : Validation de types à l'exécution
