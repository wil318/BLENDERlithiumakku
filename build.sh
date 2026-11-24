#!/usr/bin/env bash
# Lokaler Blender-Build.
#   ./build.sh               → Modell, meta.json, Vorschaubild, Icons, akku.blend (mit Video-Animation)
#   ./build.sh --no-render   → ohne Vorschaubild/Icons (schnell)
#   ./build.sh --video       → zusätzlich alle 2250 Einzelbilder rendern (Eevee, ≈ 45 min) und video/akku.mp4 bauen
# Blender-Pfad überschreibbar:  BLENDER=/opt/blender/blender ./build.sh
set -euo pipefail
cd "$(dirname "$0")"
BLENDER="${BLENDER:-blender}"
"$BLENDER" --version | head -1
ARGS=()
for a in "$@"; do [ "$a" != "--video" ] && ARGS+=("$a"); done
"$BLENDER" -b --factory-startup --python-exit-code 1 --python blender/build_akku.py -- "${ARGS[@]}"
if [[ " $* " == *" --video "* ]]; then
  rm -rf video/frames && mkdir -p video/frames
  "$BLENDER" -b blender/akku.blend -a
  python3 video/video_overlay.py
fi
ls -la web/models web/img
