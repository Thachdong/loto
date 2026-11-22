#!/usr/bin/env bash
# Sinh bộ tiếng rao MẪU (dev/QC) bằng TTS của máy: `say` (macOS, giọng vi_VN "Linh") + `ffmpeg` (AAC mono 48 kbps).
# Đầu ra: public/audio/<version>/*.m4a và public/audio/manifest.json (ADR-08).
# CỐ Ý THIẾU số 90 để kiểm đường "thiếu clip → chỉ hiện số" (Q-029). Bộ tiếng thật do đội làm riêng (BIZ-09).
# Dùng: scripts/make-sample-audio.sh [version]   (mặc định v0)
set -euo pipefail

VERSION="${1:-v0}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/public/audio"
DIR="$OUT/$VERSION"
VOICE="${SAY_VOICE:-Linh}"
SKIP_NUMBER=90

command -v say >/dev/null || { echo "Cần 'say' (macOS)." >&2; exit 1; }
command -v ffmpeg >/dev/null || { echo "Cần 'ffmpeg'." >&2; exit 1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
rm -rf "$DIR"
mkdir -p "$DIR"

# make_clip <tên file không đuôi> <câu>
make_clip() {
  say -v "$VOICE" -o "$TMP/$1.aiff" "$2"
  ffmpeg -y -loglevel error -i "$TMP/$1.aiff" -ac 1 -ar 44100 -c:a aac -b:a 48k "$DIR/$1.m4a"
}

numbers_json=""
for n in $(seq 1 89); do
  [ "$n" -eq "$SKIP_NUMBER" ] && continue
  id="$(printf '%02d' "$n")"
  make_clip "n${id}a" "$n"
  numbers_json+="\"$n\": [\"$VERSION/n${id}a.m4a\"],"
done

make_clip c1 "Con số này là"
make_clip c2 "Số tiếp theo là"
make_clip miss "Kinh hụt rồi"
make_clip kinh "Kinh"
make_clip congrats "Xin chúc mừng"

cat > "$OUT/manifest.json" <<JSON
{
  "version": "$VERSION",
  "numbers": { ${numbers_json%,} },
  "connectors": ["$VERSION/c1.m4a", "$VERSION/c2.m4a"],
  "miss": ["$VERSION/miss.m4a"],
  "kinh": ["$VERSION/kinh.m4a"],
  "congrats": ["$VERSION/congrats.m4a"]
}
JSON

# Định dạng lại cho dễ đọc nếu có python3.
if command -v python3 >/dev/null; then
  python3 - "$OUT/manifest.json" <<'PY'
import json, sys
p = sys.argv[1]
d = json.load(open(p))
open(p, "w").write(json.dumps(d, indent=2, ensure_ascii=False) + "\n")
PY
fi

echo "Đã tạo $(ls "$DIR" | wc -l | tr -d ' ') clip ở $DIR (thiếu số $SKIP_NUMBER) và $OUT/manifest.json"
du -sh "$DIR"
