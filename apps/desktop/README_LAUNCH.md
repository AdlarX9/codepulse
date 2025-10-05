# 🚀 Lancer l'Application Desktop

## Prérequis

Avant de lancer l'app desktop, assurez-vous d'avoir :

1. ✅ **Rust** installé : `rustc --version`
2. ✅ **Node.js 20+** : `node --version`
3. ✅ **pnpm** : `pnpm --version`
4. ✅ **Dépendances Tauri** : [Guide d'installation](https://tauri.app/v1/guides/getting-started/prerequisites)

### Installation des dépendances Tauri (macOS)

```bash
xcode-select --install
```

## Lancement en Mode Développement

### Option 1 : Commande Tauri Complète (Recommandé)

```bash
# Depuis la racine du projet
cd apps/desktop
pnpm tauri dev
```

Cette commande :

- ✅ Lance Vite (frontend React)
- ✅ Compile le backend Rust
- ✅ Ouvre la fenêtre de l'application
- ✅ Active le hot-reload

### Option 2 : Via le Script NPM

```bash
# Depuis la racine du projet
pnpm dev:desktop
```

⚠️ **Note**: Cette commande lance uniquement Vite. Pour lancer l'app complète, utilisez l'Option 1.

### Option 3 : Lancement Manuel (2 terminaux)

**Terminal 1** - Frontend:

```bash
cd apps/desktop
pnpm dev
```

**Terminal 2** - Tauri:

```bash
cd apps/desktop
pnpm tauri dev
```

## Vérification du Build

### Build Frontend Seulement

```bash
cd apps/desktop
pnpm build
```

Vérifie que le frontend React compile correctement.

### Build Complet (Frontend + Rust)

```bash
cd apps/desktop
pnpm tauri build
```

Crée un exécutable de production dans `src-tauri/target/release/bundle/`.

## Résolution de Problèmes

### Erreur : "Icons not found"

```bash
# Générer les icônes
python3 ../../scripts/create-dev-icons.py
```

### Erreur : "Rust compilation failed"

```bash
# Nettoyer le cache Rust
cd src-tauri
cargo clean
cd ..
pnpm tauri dev
```

### Erreur : "Port 1420 already in use"

```bash
# Tuer le processus sur le port 1420
lsof -ti:1420 | xargs kill -9
```

### L'app se lance mais la fenêtre est vide

Vérifiez que Vite est bien démarré sur `http://localhost:1420` avant que Tauri ne démarre.

## Structure de l'App

```
apps/desktop/
├── src/                    # Frontend React
│   ├── App.tsx            # Composant principal
│   ├── components/        # Composants UI
│   ├── lib/               # Utilitaires
│   └── types.ts           # Types TypeScript
├── src-tauri/             # Backend Rust
│   ├── src/
│   │   ├── main.rs        # Point d'entrée
│   │   └── scanner/       # Logique de scan
│   ├── Cargo.toml         # Dépendances Rust
│   └── tauri.conf.json    # Configuration Tauri
└── dist/                  # Build frontend (généré)
```

## Fonctionnalités Disponibles

Une fois l'app lancée, vous pouvez :

1. 📁 **Sélectionner un dossier** - Cliquer sur "Select Directory"
2. ▶️ **Lancer l'analyse** - Cliquer sur "Start Analysis"
3. 📊 **Voir les résultats** - Dashboard avec graphiques
4. 💾 **Exporter** - CSV ou JSON
5. 🌓 **Changer le thème** - Light/Dark/System

## Logs de Débogage

### Voir les logs Rust

```bash
RUST_LOG=debug pnpm tauri dev
```

### Voir les logs Tauri

```bash
RUST_BACKTRACE=1 pnpm tauri dev
```

### Console DevTools

Dans l'app, faites un clic droit → "Inspect Element" pour ouvrir les DevTools.

## Commandes Utiles

```bash
# Vérifier la configuration Tauri
pnpm tauri info

# Nettoyer tous les builds
pnpm tauri clean

# Mettre à jour les dépendances Tauri
pnpm update @tauri-apps/api @tauri-apps/cli

# Tester le backend Rust
cd src-tauri
cargo test
```

## Performance

L'application peut scanner :

- ~10,000 fichiers en 2-3 secondes
- ~100,000 fichiers en 20-30 secondes

(Varie selon le matériel et la taille des fichiers)

## Prochaines Étapes

1. ✅ Lancer l'app : `cd apps/desktop && pnpm tauri dev`
2. ✅ Tester la sélection de dossier
3. ✅ Analyser un projet
4. ✅ Vérifier les graphiques
5. ✅ Tester l'export CSV/JSON

---

**Besoin d'aide ?** Consultez la [documentation Tauri](https://tauri.app/v1/guides/)
