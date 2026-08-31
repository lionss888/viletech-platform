#!/usr/bin/env sh
# Validates vdp product docs: h1-h3 and p only (see docs/conventions/format.md).
set -eu

ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

fail=0
checked=0

check_file() {
  rel="$1"
  checked=$((checked + 1))
  dev_ok=0
  case "$rel" in
    docs/development/*) dev_ok=1 ;;
  esac

  h1=0
  in_fence=0
  line_num=0

  while IFS= read -r line || [ -n "$line" ]; do
    line_num=$((line_num + 1))

    case "$line" in
      '```'*)
        if [ "$dev_ok" -eq 1 ]; then
          if [ "$in_fence" -eq 0 ]; then
            in_fence=1
          else
            in_fence=0
          fi
          continue
        fi
        echo "FAIL $rel:$line_num fenced code block not allowed outside docs/development/"
        fail=1
        continue
        ;;
    esac

    if [ "$in_fence" -eq 1 ]; then
      continue
    fi

    case "$line" in
      '# '*) h1=$((h1 + 1)) ;;
    esac

    case "$line" in
      '####'*|'#####'*)
        echo "FAIL $rel:$line_num heading h4+ forbidden: $line"
        fail=1
        ;;
    esac

    if [ "$line" = '---' ] || [ "$line" = '***' ] || [ "$line" = '___' ]; then
      echo "FAIL $rel:$line_num horizontal rule forbidden: $line"
      fail=1
    fi

    if echo "$line" | grep -q '^[[:space:]]*[-*][[:space:]]'; then
      echo "FAIL $rel:$line_num list marker forbidden: $line"
      fail=1
    fi

    if echo "$line" | grep -q '^[[:space:]]*[0-9][0-9]*\.[[:space:]]'; then
      echo "FAIL $rel:$line_num numbered list forbidden: $line"
      fail=1
    fi

    if echo "$line" | grep -q '^[[:space:]]*- \[[ xX]\]'; then
      echo "FAIL $rel:$line_num checkbox forbidden: $line"
      fail=1
    fi

    if echo "$line" | grep -q '^[[:space:]]*|'; then
      echo "FAIL $rel:$line_num markdown table forbidden: $line"
      fail=1
    fi

    if echo "$line" | grep -q '^[[:space:]]*>'; then
      echo "FAIL $rel:$line_num blockquote forbidden: $line"
      fail=1
    fi

    if echo "$line" | grep -q '`'; then
      if [ "$dev_ok" -eq 0 ]; then
        echo "FAIL $rel:$line_num backticks forbidden outside docs/development/: $line"
        fail=1
      fi
    fi

    if echo "$line" | grep -qE '\*\*[^*]+\*\*'; then
      echo "FAIL $rel:$line_num bold forbidden: $line"
      fail=1
    fi

  done < "$rel"

  if [ "$h1" -ne 1 ]; then
    echo "FAIL $rel must have exactly one h1 heading, found $h1"
    fail=1
  fi
}

check_file README.md
for f in $(find docs -type f -name '*.md' | sort); do
  check_file "$f"
done

if [ "$fail" -ne 0 ]; then
  echo "docs-format-check: FAILED ($checked files)"
  exit 1
fi

echo "docs-format-check: OK ($checked files)"
exit 0
