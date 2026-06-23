#!/usr/bin/env bash
# Shared helpers for BKG backup / restore tooling.
# Sourced by pg-backup.sh, pg-restore.sh, selftest.sh. Not meant to be run directly.

# Production DB host(s). Restoring INTO any of these is blocked unless ALLOW_PROD_RESTORE=1.
# Space-separated. Update after the dedicated-prod cutover (add the new host, keep the old shared one).
PROD_DB_HOSTS="${PROD_DB_HOSTS:-db.vlezoyalutexenbnzzui.supabase.co}"

log() { printf '%s [backup] %s\n' "$(date -u +%H:%M:%S)" "$*" >&2; }
die() { printf '%s [backup] ERROR: %s\n' "$(date -u +%H:%M:%S)" "$*" >&2; exit 1; }

# Put Homebrew postgresql@17 on PATH (macOS, both arches) if present; then require the binaries.
ensure_pg_on_path() {
  local p
  for p in /opt/homebrew/opt/postgresql@17/bin /usr/local/opt/postgresql@17/bin; do
    if [ -d "$p" ]; then case ":$PATH:" in *":$p:"*) :;; *) PATH="$p:$PATH";; esac; fi
  done
  export PATH
  command -v pg_dump   >/dev/null || die "pg_dump not found — install client (brew install postgresql@17 / apt install postgresql-client-17)"
  command -v pg_restore >/dev/null || die "pg_restore not found"
}

# Extract the host from a postgres connection URL (best-effort; cosmetic + prod-guard only).
db_host() { printf '%s' "$1" | sed -E 's#^[a-zA-Z]+://[^@]*@([^:/?]+).*#\1#'; }

is_prod_host() { local h; for h in $PROD_DB_HOSTS; do [ "$1" = "$h" ] && return 0; done; return 1; }

# s3 | file  (also validates the scheme)
dest_kind() {
  case "$1" in
    s3://*)   echo s3 ;;
    file://*) echo file ;;
    *) die "storage URI must start with s3:// or file:// (got: $1)" ;;
  esac
}

# storage_put <localfile> <dir-uri>
storage_put() {
  local src="$1" dest="$2"; case "$(dest_kind "$dest")" in
    s3)   aws s3 cp "$src" "${dest%/}/$(basename "$src")" ${R2_ENDPOINT:+--endpoint-url "$R2_ENDPOINT"} --only-show-errors ;;
    file) local d="${dest#file://}"; mkdir -p "$d"; cp "$src" "$d/$(basename "$src")" ;;
  esac
}

# storage_get <name> <dir-uri> <localout>
storage_get() {
  local name="$1" src="$2" out="$3"; case "$(dest_kind "$src")" in
    s3)   aws s3 cp "${src%/}/$name" "$out" ${R2_ENDPOINT:+--endpoint-url "$R2_ENDPOINT"} --only-show-errors ;;
    file) cp "${src#file://}/$name" "$out" ;;
  esac
}

# storage_ls <dir-uri>  -> basenames, one per line
storage_ls() {
  local src="$1"; case "$(dest_kind "$src")" in
    s3)   aws s3 ls "${src%/}/" ${R2_ENDPOINT:+--endpoint-url "$R2_ENDPOINT"} | awk '{print $NF}' ;;
    file) local d="${src#file://}"; [ -d "$d" ] && ls -1 "$d" || true ;;
  esac
}

# storage_rm <name> <dir-uri>
storage_rm() {
  local name="$1" src="$2"; case "$(dest_kind "$src")" in
    s3)   aws s3 rm "${src%/}/$name" ${R2_ENDPOINT:+--endpoint-url "$R2_ENDPOINT"} --only-show-errors ;;
    file) rm -f "${src#file://}/$name" ;;
  esac
}

sha256_of() {
  if command -v sha256sum >/dev/null; then sha256sum "$1" | awk '{print $1}';
  else shasum -a 256 "$1" | awk '{print $1}'; fi
}
