#!/bin/bash
# Generates:
#   - images/manifest.json  for each blog entry with an images/ folder
#   - blog-index.json       at blog level, listing all entries (for the root index)
#
# Run from the blog/ directory: ./generate-manifest.sh
# Or for one entry only:        ./generate-manifest.sh frackwoche-2025
#
# Expected structure per entry:
#   <entry>/
#     date          plain text file, e.g. "Sept. 2025"
#     images/
#       stepA/   img1.jpg img2.png ...
#       stepB/   ...

set -e
BLOG_DIR="$(cd "$(dirname "$0")" && pwd)"

generate_manifest_for() {
  local entry_dir="$1"
  local images_dir="$entry_dir/images"
  local out="$images_dir/manifest.json"

  if [ ! -d "$images_dir" ]; then
    echo "  Skipping $(basename "$entry_dir"): no images/ directory"
    return
  fi

  echo "  Scanning $(basename "$entry_dir")/images/ ..."
  printf '{\n  "steps": [\n' > "$out"

  local first_step=true
  for step_dir in "$images_dir"/*/; do
    [ -d "$step_dir" ] || continue
    local step_name
    step_name=$(basename "$step_dir")

    local images=()
    while IFS= read -r -d '' f; do
      images+=("$(basename "$f")")
    done < <(find "$step_dir" -maxdepth 1 -type f \( \
      -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \
    \) -print0 | sort -z)

    [ ${#images[@]} -eq 0 ] && continue

    $first_step || printf ',\n' >> "$out"
    first_step=false

    local pretty
    pretty=$(echo "$step_name" | sed 's/[-_]/ /g' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) tolower(substr($i,2)); print}')

    printf '    {\n      "name": "%s",\n      "dir": "%s",\n      "images": [\n' \
      "$pretty" "$step_name" >> "$out"

    local first_img=true
    for img in "${images[@]}"; do
      $first_img || printf ',\n' >> "$out"
      first_img=false
      printf '        "%s"' "$img" >> "$out"
    done
    printf '\n      ]\n    }' >> "$out"
  done

  printf '\n  ]\n}\n' >> "$out"
  echo "  Written: $out"
}

generate_blog_index() {
  local out="$BLOG_DIR/blog-index.json"
  local index_html="$BLOG_DIR/../index.html"
  echo "Generating blog-index.json ..."

  printf '{\n  "entries": [\n' > "$out"

  local first=true
  local entries_js=""
  # Sort entries newest-first by directory name (descending)
  while IFS= read -r entry_dir; do
    [ -d "$entry_dir" ] || continue
    local dir_name
    dir_name=$(basename "$entry_dir")

    # Read date file if present
    local date_val=""
    if [ -f "$entry_dir/date" ]; then
      date_val=$(cat "$entry_dir/date" | tr -d '\n')
    fi

    # Derive title from folder name (replace - with space, capitalise each word)
    local title
    title=$(echo "$dir_name" | sed 's/[-_]/ /g' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) tolower(substr($i,2)); print}')

    $first || printf ',\n' >> "$out"
    first=false

    printf '    {\n      "dir": "%s",\n      "title": "%s",\n      "date": "%s"\n    }' \
      "$dir_name" "$title" "$date_val" >> "$out"

    entries_js="${entries_js}                <a href=\"blog/${dir_name}/\" class=\"blog-preview\">\n                    <span class=\"blog-date\">${date_val}</span>\n                    <span class=\"blog-title\">${title}</span>\n                </a>\n"
  done < <(find "$BLOG_DIR" -mindepth 1 -maxdepth 1 -type d | sort -r)

  printf '\n  ]\n}\n' >> "$out"
  echo "Written: $out"

  # Inject entries into index.html between the markers
  if [ -f "$index_html" ]; then
    # Use awk to replace everything between the markers
    awk -v entries="$entries_js" '
      /<!-- BLOG_LIST_START -->/ { print; printf "%s", entries; skip=1; next }
      /<!-- BLOG_LIST_END -->/ { skip=0 }
      !skip { print }
    ' "$index_html" > "${index_html}.tmp" && mv "${index_html}.tmp" "$index_html"
    echo "Injected blog list into index.html"
  fi
}

if [ -n "$1" ]; then
  generate_manifest_for "$BLOG_DIR/$1"
else
  echo "Generating image manifests for all blog entries..."
  for entry in "$BLOG_DIR"/*/; do
    [ -d "$entry" ] || continue
    generate_manifest_for "$entry"
  done
  echo ""
  generate_blog_index
  echo "Done."
fi
