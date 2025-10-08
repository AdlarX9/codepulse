# 🚀 Getting Started - CodePulse

Guide de démarrage rapide pour lancer CodePulse en local.

## 📋 Prérequis

### Pour l'App Desktop

- ✅ **Node.js 20+** : [Télécharger](https://nodejs.org/)
- ✅ **pnpm 9+** : `npm install -g pnpm`
- ✅ **Rust 1.70+** : [Installer](https://rustup.rs/)
- ✅ **Dépendances Tauri** : [Guide](https://tauri.app/v1/guides/getting-started/prerequisites)

**macOS** :

```bash
xcode-select --install

**Ubuntu/Debian** :

```bash
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev build-essential curl wget file libssl-dev libgtk-3-dev libayatana-appindicator3-dev libgstreamer1.0-dev libgstreamer-plugins-base1.0-dev libgirepository-1.0-dev libglib2.0-dev libgobject-introspection-dev libgstreamer-plugins-bad1.0-dev libgstreamer-plugins-good1.0-dev libgstreamer-plugins-ugly1.0-dev libgstreamer-plugins-base1.0-dev libgstreamer-plugins-good1.0-dev libgstreamer-plugins-bad1.0-dev libgstreamer-plugins-ugly1.0-dev

### Fonctionnalités :

- 📁 Sélectionner un dossier à analyser
- ▶️ Lancer le scan
- 📊 Voir les statistiques (KPIs, graphiques)
- 💾 Exporter en CSV ou JSON
- 🌓 Thème clair/sombre

## 🌐 Lancer l'App Web

### 1. Configurer Supabase

**Créer un projet** :

1. Allez sur [supabase.com](https://supabase.com)
2. Créez un nouveau projet
3. Attendez le provisionnement (~2 min)

**Exécuter la migration** :

1. Dans Supabase, allez dans **SQL Editor**
2. Copiez le contenu de `supabase-migration.sql`
3. Exécutez-le

**Récupérer les credentials** :

- Settings → API → Project URL
- Settings → API → service_role key (⚠️ secret)

### 2. Configurer l'Environnement

```bash
cd apps/web
cp .env.example .env.local
```

Éditez `.env.local` :

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
DOWNLOAD_IP_SALT=changez-moi-chaine-aleatoire-longue
NEXT_ADMIN_USER=admin
NEXT_ADMIN_PASS=mot-de-passe-fort
GITHUB_REPO=AdlarX9/code-pulse
```

### 3. Lancer le Serveur

**Méthode 1 : Script Automatique**

```bash
bash scripts/launch-web.sh
```

**Méthode 2 : Commande Manuelle**

```bash
cd apps/web
pnpm dev
```

### Pages Disponibles :

- **/** : Landing page avec animations
- **/privacy** : Politique de confidentialité
- **/admin** : Dashboard analytics (Basic Auth)
- **/api/download** : API de tracking

## 🧪 Tester

### Build Complet

```bash
pnpm -w build
```

Vérifie que tout compile (TypeScript + Rust + Next.js).

### Build Desktop Seulement

```bash
pnpm build:desktop
```

### Build Web Seulement

```bash
pnpm build:web
```

## 📁 Structure du Projet

```
code-pulse/
├── apps/
│   ├── desktop/              # App Tauri (React + Rust)
│   │   ├── src/              # Frontend React
│   │   ├── src-tauri/        # Backend Rust
│   │   └── README_LAUNCH.md  # Guide détaillé
│   └── web/                  # Site Next.js
│       ├── src/app/          # Pages et API
│       └── README_LAUNCH.md  # Guide détaillé
├── packages/
│   ├── core/                 # Types partagés
│   └── telemetry/            # Logging
├── scripts/
│   ├── create-dev-icons.py   # Générateur d'icônes
│   ├── launch-desktop.sh     # Lancement desktop
│   └── launch-web.sh         # Lancement web
└── docs/                     # Documentation
```

## 🔧 Résolution de Problèmes

### Desktop : "Icons not found"

```bash
python3 scripts/create-dev-icons.py
```

### Desktop : "Rust compilation failed"

```bash
cd apps/desktop/src-tauri
cargo clean
cd ../..
pnpm tauri dev
```

### Web : "SUPABASE_URL is not defined"

Vérifiez que `.env.local` existe et contient les bonnes variables.

### Port déjà utilisé

```bash
# Desktop (port 1420)
lsof -ti:1420 | xargs kill -9

# Web (port 3000)
lsof -ti:3000 | xargs kill -9
```

## 📚 Documentation Détaillée

- **[README.md](README.md)** - Documentation complète
- **[FIXES_APPLIED.md](FIXES_APPLIED.md)** - Corrections appliquées
- **[SETUP_ICONS.md](SETUP_ICONS.md)** - Guide icônes
- **[apps/desktop/README_LAUNCH.md](apps/desktop/README_LAUNCH.md)** - Guide desktop détaillé
- **[apps/web/README_LAUNCH.md](apps/web/README_LAUNCH.md)** - Guide web détaillé

## 🎨 Personnalisation

### Changer les Icônes

1. Créez une icône 1024x1024 PNG
2. Placez-la dans `apps/desktop/src/assets/icon.png`
3. Exécutez :
    ```bash
    cd apps/desktop
    pnpm tauri icon src/assets/icon.png
    ```

### Changer le Nom de l'App

Éditez :

- `apps/desktop/src-tauri/tauri.conf.json` → `package.productName`
- `apps/desktop/src-tauri/Cargo.toml` → `name`
- `package.json` → `name`

### Changer les Couleurs

Éditez `apps/desktop/src/styles.css` et `apps/web/src/app/globals.css` :

- `--primary` : Couleur principale
- `--background` : Fond
- etc.

## 🚀 Prochaines Étapes

### Desktop

1. ✅ Lancer : `bash scripts/launch-desktop.sh`
2. ✅ Sélectionner un dossier
3. ✅ Analyser votre code
4. ✅ Explorer les résultats

### Web

1. ✅ Configurer Supabase
2. ✅ Créer `.env.local`
3. ✅ Lancer : `bash scripts/launch-web.sh`
4. ✅ Tester la landing page
5. ✅ Accéder à `/admin`

### Production

1. ✅ Build : `pnpm -w build`
2. ✅ Tester les builds
3. ✅ Créer un tag : `pnpm release:tag v1.0.0`
4. ✅ Déployer web sur Vercel

## 💡 Conseils

- **Desktop** : La première compilation Rust est longue, soyez patient
- **Web** : Utilisez des mots de passe forts pour l'admin
- **Sécurité** : Ne commitez jamais `.env.local`
- **Performance** : Le scanner peut traiter 10k+ fichiers en quelques secondes

## 🆘 Besoin d'Aide ?

- 📖 [Documentation Tauri](https://tauri.app/v1/guides/)
- 📖 [Documentation Next.js](https://nextjs.org/docs)
- 🐛 [Ouvrir une issue](https://github.com/AdlarX9/code-pulse/issues)

---

**Bon développement ! 🎉**
