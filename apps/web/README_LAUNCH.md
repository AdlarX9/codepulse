# 🌐 Lancer l'Application Web

## Prérequis

1. ✅ **Node.js 20+** : `node --version`
2. ✅ **pnpm** : `pnpm --version`
3. ✅ **Compte Supabase** : [supabase.com](https://supabase.com)

## Configuration Initiale

### 1. Créer un Projet Supabase

1. Allez sur [supabase.com](https://supabase.com)
2. Créez un nouveau projet
3. Attendez que le projet soit provisionné (~2 minutes)

### 2. Exécuter la Migration SQL

1. Dans le dashboard Supabase, allez dans **SQL Editor**
2. Ouvrez le fichier `../../supabase-migration.sql`
3. Copiez-collez le contenu dans l'éditeur SQL
4. Cliquez sur **Run**

Cela crée la table `downloads` avec les index et les politiques RLS.

### 3. Récupérer les Credentials

Dans Supabase, allez dans **Settings** → **API** :

- **Project URL** : `https://xxxxx.supabase.co`
- **anon public key** : Pour le frontend (optionnel)
- **service_role key** : Pour l'API backend ⚠️ **SECRET**

### 4. Configurer les Variables d'Environnement

```bash
cd apps/web
cp .env.example .env.local
```

Éditez `.env.local` :

```env
# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...votre-clé-secrète

# Sécurité
DOWNLOAD_IP_SALT=changez-moi-avec-une-chaine-aleatoire-longue

# Admin Dashboard
NEXT_ADMIN_USER=admin
NEXT_ADMIN_PASS=changez-moi-mot-de-passe-fort

# GitHub (optionnel pour résolution des assets)
GITHUB_TOKEN=ghp_xxx
GITHUB_REPO=AdlarX9/code-pulse
```

⚠️ **Important** :

- Ne commitez JAMAIS `.env.local` dans Git
- Utilisez des mots de passe forts
- Changez `DOWNLOAD_IP_SALT` pour quelque chose d'unique

## Lancement en Mode Développement

```bash
# Depuis la racine du projet
pnpm dev:web

# Ou depuis apps/web
cd apps/web
pnpm dev
```

L'application sera disponible sur **http://localhost:3000**

## Pages Disponibles

### 1. Landing Page - `/`

- Hero animé avec Framer Motion
- Sections Features, Privacy, Download
- Boutons de téléchargement pour chaque plateforme

### 2. Privacy Policy - `/privacy`

- Politique de confidentialité
- Détails sur les données collectées

### 3. Admin Dashboard - `/admin`

- **Authentification** : Basic Auth (NEXT_ADMIN_USER / NEXT_ADMIN_PASS)
- **Statistiques** :
    - Téléchargements au fil du temps
    - Répartition par plateforme (pie chart)
    - Top pays (bar chart)
    - Distribution des versions
- **Export CSV**

### 4. API Routes

#### `/api/download?platform=mac|win|linux`

- Enregistre le téléchargement dans Supabase
- Redirige vers l'asset GitHub
- Headers utilisés :
    - `x-forwarded-for` : IP (hashée)
    - `x-vercel-ip-country` : Pays
    - `x-vercel-ip-city` : Ville
    - `user-agent` : Navigateur

#### `/api/admin/stats`

- Retourne les statistiques de téléchargement
- Protégé par Basic Auth
- Format JSON

## Build de Production

```bash
cd apps/web
pnpm build
```

Vérifie que tout compile correctement.

## Déploiement

### Option 1 : Vercel (Recommandé)

1. Connectez votre repo GitHub à Vercel
2. Configurez les variables d'environnement dans Vercel
3. Déployez

Ou via CLI :

```bash
npm i -g vercel
cd apps/web
vercel --prod
```

### Option 2 : Autre Plateforme

```bash
cd apps/web
pnpm build
pnpm start
```

Déployez le dossier `.next` avec un runtime Node.js.

## Tester l'API de Téléchargement

### Test Local

```bash
# Tester le tracking + redirect
curl -L "http://localhost:3000/api/download?platform=mac"

# Vérifier les stats
curl -u admin:changez-moi "http://localhost:3000/api/admin/stats"
```

### Vérifier dans Supabase

1. Allez dans **Table Editor** → `downloads`
2. Vous devriez voir les téléchargements enregistrés
3. Les IPs sont hashées (SHA-256)

## Résolution de Problèmes

### Erreur : "SUPABASE_URL is not defined"

Vérifiez que `.env.local` existe et contient les bonnes variables.

### Erreur : "Failed to fetch stats"

1. Vérifiez que la migration SQL a été exécutée
2. Vérifiez que `SUPABASE_SERVICE_ROLE_KEY` est correct
3. Vérifiez les logs Supabase

### Admin Dashboard : 401 Unauthorized

Vérifiez que vous utilisez les bons credentials (`NEXT_ADMIN_USER` / `NEXT_ADMIN_PASS`).

### Les téléchargements ne sont pas trackés

1. Vérifiez que la table `downloads` existe
2. Vérifiez les logs de l'API : `pnpm dev` (terminal)
3. Vérifiez que `DOWNLOAD_IP_SALT` est défini

### Warning : metadataBase not set

Ajoutez dans `apps/web/src/app/layout.tsx` :

```typescript
export const metadata = {
	metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
	// ... reste de la config
}
```

## Sécurité

### Protection des Secrets

- ✅ `.env.local` est dans `.gitignore`
- ✅ Service role key jamais exposé au client
- ✅ Basic Auth pour l'admin
- ✅ IPs hashées avec salt

### Rate Limiting (Production)

Considérez ajouter du rate limiting sur `/api/download` :

```typescript
// Exemple avec Vercel Edge Config
import { ratelimit } from '@/lib/ratelimit'

const { success } = await ratelimit.limit(ip)
if (!success) {
	return new Response('Too many requests', { status: 429 })
}
```

## Monitoring

### Vercel Analytics

Activez Vercel Analytics dans votre dashboard pour :

- Page views
- Core Web Vitals
- Erreurs

### Supabase Logs

Dans Supabase, allez dans **Logs** pour voir :

- Requêtes SQL
- Erreurs
- Performance

## Prochaines Étapes

1. ✅ Configurer Supabase
2. ✅ Créer `.env.local`
3. ✅ Lancer : `pnpm dev:web`
4. ✅ Tester la landing page
5. ✅ Tester l'admin dashboard
6. ✅ Déployer sur Vercel

---

**Besoin d'aide ?** Consultez la [documentation Next.js](https://nextjs.org/docs)
