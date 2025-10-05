#!/usr/bin/env bash
set -euo pipefail

# -----------------------------------------------------------------------------
# Script de build Tauri multi-plateformes
# - macOS (Apple Silicon) -> DMG
# - Linux -> AppImage (+ deb/rpm si toolchain disponible)
# - Windows -> (NOTE) nécessite Windows natif ou CI (GitHub Actions). Voir plus bas.
#
# Prérequis généraux:
# - Node.js 18+ et Corepack (pour pnpm/yarn) OU npm
# - Rust toolchain (rustup, cargo)
# - Tauri CLI installé en dépendance du projet (devDependency) ou accessible via npx
#
# Prérequis macOS:
# - Xcode Command Line Tools (xcode-select --install)
# - Sur Apple Silicon (arm64) : build natif OK
# - Sur Intel (x86_64) : la cross-compilation vers arm64 est délicate. Recommandé: builder sur une machine arm64.
#
# Prérequis Linux:
# - Pour build natif: toolchains desktop (gtk, appimagetool, etc.); plus simple via Docker officiel Tauri.
#
# Windows:
# - Build fiable uniquement depuis Windows (WiX/NSIS). Utilisez ce script depuis Windows, ou préférez une CI GitHub Actions.
#
# Usage:
#   ./build-tauri.sh [--platform mac|linux|windows|all] [--no-install] [--linux-bundles appimage|all]
#
# Exemples:
#   ./build-tauri.sh --platform mac            # DMG Apple Silicon (depuis un Mac arm64)
#   ./build-tauri.sh --platform linux          # Build Linux (natif si Linux, sinon via Docker)
#   ./build-tauri.sh --platform all            # Tente mac + linux (windows = message d’aide)
# -----------------------------------------------------------------------------

PLATFORM="all"
DO_INSTALL="yes"
LINUX_BUNDLES="appimage"   # "appimage" ou "all" (appimage+deb+rpm si possible)

# Détection du gestionnaire de paquets JS
PKG_MANAGER=""
INSTALL_CMD=""
BUILD_CMD_TAURI=""

detect_pkg_manager() {
  if [[ -f "pnpm-lock.yaml" ]]; then
    PKG_MANAGER="pnpm"
    INSTALL_CMD="pnpm install --frozen-lockfile"
    BUILD_CMD_TAURI="pnpm tauri build"
  elif [[ -f "yarn.lock" ]]; then
    PKG_MANAGER="yarn"
    INSTALL_CMD="yarn install --frozen-lockfile"
    BUILD_CMD_TAURI="yarn tauri build"
  else
    PKG_MANAGER="npm"
    INSTALL_CMD="npm ci || npm install"
    BUILD_CMD_TAURI="npx tauri build"
  fi
}

msg() { echo -e "\033[1;34m[build-tauri]\033[0m $*"; }
warn() { echo -e "\033[1;33m[build-tauri]\033[0m $*"; }
err() { echo -e "\033[1;31m[build-tauri]\033[0m $*" >&2; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --platform)
      PLATFORM="${2:-all}"; shift 2;;
    --no-install)
      DO_INSTALL="no"; shift;;
    --linux-bundles)
      LINUX_BUNDLES="${2:-appimage}"; shift 2;;
    -h|--help)
      sed -n '1,120p' "$0" | sed 's/^# \{0,1\}//'; exit 0;;
    *)
      err "Option inconnue: $1"; exit 1;;
  esac
done

detect_pkg_manager

ensure_prereqs_common() {
  command -v node >/dev/null 2>&1 || { err "Node.js est requis"; exit 1; }
  command -v rustup >/dev/null 2>&1 || { err "rustup est requis"; exit 1; }
  command -v cargo >/dev/null 2>&1 || { err "cargo est requis"; exit 1; }

  if [[ "${PKG_MANAGER}" == "pnpm" || "${PKG_MANAGER}" == "yarn" ]]; then
    command -v corepack >/dev/null 2>&1 || warn "Corepack non trouvé (facultatif)."
    # Activer corepack si dispo (pour pnpm/yarn)
    if command -v corepack >/dev/null 2>&1; then corepack enable || true; fi
  fi

  if [[ "${DO_INSTALL}" == "yes" ]]; then
    msg "Installation des dépendances JS via ${PKG_MANAGER}…"
    eval "${INSTALL_CMD}"
  else
    msg "Skip install des dépendances JS (--no-install)."
  fi
}

build_macos_arm64() {
  local ARCH
  ARCH="$(uname -m)"
  if [[ "$(uname)" != "Darwin" ]]; then
    err "Build macOS: lancez cette cible sur macOS (Apple Silicon recommandé)."
    return 1
  fi
  if [[ "${ARCH}" != "arm64" ]]; then
    warn "Vous n’êtes pas sur Apple Silicon (arch=${ARCH}). La cross-compilation vers arm64 peut échouer."
    warn "Recommandé: builder sur un Mac Apple Silicon."
  fi

  msg "Ajout de la cible Rust aarch64-apple-darwin (si manquante)…"
  rustup target add aarch64-apple-darwin || true

  msg "Build Tauri macOS (dmg)…"
  # Le bundler crée un .app et un .dmg; on force bundles dmg pour clarté.
  # Si votre tauri.conf.json gère déjà ça, l’option --bundles est optionnelle.
  if [[ "${ARCH}" == "arm64" ]]; then
    # Build natif arm64
    eval "${BUILD_CMD_TAURI} --bundles dmg"
    OUT_DIR="src-tauri/target/release/bundle/dmg"
  else
    # Tentative cross-target arm64
    eval "${BUILD_CMD_TAURI} --bundles dmg --target aarch64-apple-darwin"
    OUT_DIR="src-tauri/target/aarch64-apple-darwin/release/bundle/dmg"
  fi

  mkdir -p dist/macos
  if compgen -G "${OUT_DIR}/*.dmg" > /dev/null; then
    cp -f "${OUT_DIR}"/*.dmg dist/macos/
    msg "DMG copié dans dist/macos/"
  else
    err "DMG non trouvé dans ${OUT_DIR}. Vérifiez la config Tauri."
    return 1
  fi
}

build_linux_native() {
  msg "Build Tauri Linux (${LINUX_BUNDLES})…"
  local bundles_arg="--bundles appimage"
  if [[ "${LINUX_BUNDLES}" == "all" ]]; then
    bundles_arg="--bundles appimage deb rpm"
  fi
  eval "${BUILD_CMD_TAURI} ${bundles_arg}"
  # Collecte des artefacts
  local base="src-tauri/target/release/bundle"
  mkdir -p dist/linux
  if [[ -d "${base}" ]]; then
    find "${base}" -maxdepth 2 -type f \( -name "*.AppImage" -o -name "*.deb" -o -name "*.rpm" \) -exec cp -f {} dist/linux/ \;
    msg "Artefacts Linux copiés dans dist/linux/"
  else
    warn "Répertoire bundle Linux introuvable: ${base}"
  fi
}

build_linux_docker() {
  msg "Build Linux via Docker (ghcr.io/tauri-apps/tauri)…"
  local img="ghcr.io/tauri-apps/tauri:latest"
  docker pull "${img}"

  # Utilisateur courant pour éviter les fichiers root:root
  local uid gid
  uid="$(id -u)"; gid="$(id -g)"

  local bundles_arg="--bundles appimage"
  if [[ "${LINUX_BUNDLES}" == "all" ]]; then
    bundles_arg="--bundles appimage deb rpm"
  fi

  docker run --rm \
    -u "${uid}:${gid}" \
    -v "$PWD":/app \
    -w /app \
    -e CI=1 \
    "${img}" \
    sh -lc "
      set -e
      if [ -f pnpm-lock.yaml ]; then corepack enable && pnpm install --frozen-lockfile && pnpm tauri build ${bundles_arg}; \
      elif [ -f yarn.lock ]; then corepack enable && yarn install --frozen-lockfile && yarn tauri build ${bundles_arg}; \
      else npm ci || npm install; npx tauri build ${bundles_arg}; fi
    "

  mkdir -p dist/linux
  local base="src-tauri/target/release/bundle"
  if [[ -d "${base}" ]]; then
    find "${base}" -maxdepth 2 -type f \( -name "*.AppImage" -o -name "*.deb" -o -name "*.rpm" \) -exec cp -f {} dist/linux/ \;
    msg "Artefacts Linux copiés dans dist/linux/"
  else
    warn "Répertoire bundle Linux introuvable: ${base}"
  fi
}

build_linux() {
  if [[ "$(uname)" == "Linux" ]]; then
    build_linux_native
  else
    command -v docker >/dev/null 2>&1 || { err "Docker est requis pour builder Linux depuis macOS/Windows."; return 1; }
    build_linux_docker
  fi
}

build_windows_note_or_native() {
  if [[ "$(uname -s)" =~ MINGW|MSYS|CYGWIN || "$OS" == "Windows_NT" ]]; then
    msg "Build Windows natif…"
    # Bundles: nsis et/ou msi selon votre config. Exemple avec nsis:
    eval "${BUILD_CMD_TAURI} --bundles nsis"
    mkdir -p dist/windows
    local base="src-tauri/target/release/bundle"
    if [[ -d "${base}" ]]; then
      find "${base}" -maxdepth 2 -type f \( -name "*.exe" -o -name "*.msi" \) -exec cp -f {} dist/windows/ \;
      msg "Artefacts Windows copiés dans dist/windows/"
    else
      warn "Répertoire bundle Windows introuvable: ${base}"
    fi
  else
    warn "Build Windows: lancez ce script depuis Windows pour un build fiable (WiX/NSIS requis),"
    warn "ou utilisez une CI (GitHub Actions) avec matrice Tauri. Cette étape est ignorée ici."
  fi
}

make_checksums() {
  if compgen -G "dist/**/*" > /dev/null; then
    msg "Génération des checksums SHA256…"
    pushd dist >/dev/null
      # macOS: shasum -a 256 ; Linux: sha256sum
      if command -v sha256sum >/dev/null 2>&1; then
        find . -type f ! -name "checksums.txt" -print0 | xargs -0 sha256sum > checksums.txt
      else
        find . -type f ! -name "checksums.txt" -print0 | xargs -0 shasum -a 256 > checksums.txt
      fi
      msg "Fichier checksums.txt généré dans dist/"
    popd >/dev/null
  else
    warn "Aucun artefact trouvé dans dist/, checksums non générés."
  fi
}

# ----------------------------------------------------------------------------- #
# Exécution
# ----------------------------------------------------------------------------- #

ensure_prereqs_common

case "${PLATFORM}" in
  mac)
    build_macos_arm64
    ;;
  linux)
    build_linux
    ;;
  windows)
    build_windows_note_or_native
    ;;
  all)
    # macOS + Linux local (et note pour Windows)
    if [[ "$(uname)" == "Darwin" ]]; then
      build_macos_arm64 || true
    fi
    build_linux || true
    build_windows_note_or_native || true
    ;;
  *)
    err "Plateforme inconnue: ${PLATFORM} (attendu: mac|linux|windows|all)"; exit 1;;
esac

make_checksums

msg "Build terminé. Artefacts dans ./dist"