// Split each policy page into short passages. Later search points at one
// passage, not a whole file. A citation is one of these passages.

const fs = require("fs");
const path = require("path");

const docsDir = path.join(__dirname, "docs");

// A heading section longer than this is cut again, with a little repeated
// text at the join, so a citation stays a short passage. These pages are
// short, so heading splits are enough and this limit is a safety net.
const MAX_CHUNK_CHARS = 800;
const OVERLAP_CHARS = 80;

// readFlag(argv, flag) → the value after --file (or similar), or null.
function readFlag(argv, flag) {
  const index = argv.indexOf(flag);
  if (index === -1 || !argv[index + 1]) {
    return null;
  }
  return argv[index + 1];
}

// slugify(text) → a short id piece, e.g. "Annual plans" → "annual-plans".
function slugify(text) {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug.slice(0, 40) || "section";
}

// splitLong(text) → [text] when it is short, or overlapping pieces when it is not.
function splitLong(text) {
  if (text.length <= MAX_CHUNK_CHARS) {
    return [text];
  }

  const pieces = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + MAX_CHUNK_CHARS, text.length);

    // Prefer a paragraph or sentence break near the end of the window.
    if (end < text.length) {
      const window = text.slice(start, end);
      const paragraph = window.lastIndexOf("\n\n");
      const sentence = Math.max(window.lastIndexOf(". "), window.lastIndexOf(".\n"));
      const breakAt =
        paragraph > MAX_CHUNK_CHARS * 0.5
          ? paragraph
          : sentence > MAX_CHUNK_CHARS * 0.5
            ? sentence + 1
            : -1;
      if (breakAt !== -1) {
        end = start + breakAt;
      }
    }

    const piece = text.slice(start, end).trim();
    if (piece) {
      pieces.push(piece);
    }
    if (end >= text.length) {
      break;
    }
    // Step forward, but repeat OVERLAP_CHARS so a sentence on the cut is in both pieces.
    start = Math.max(end - OVERLAP_CHARS, start + 1);
  }

  return pieces;
}

// chunkMarkdown(filename, text) → passages for one file.
// Each passage is { id, source, text }. Split on ## headings. Text above the
// first heading (the page intro) is its own passage.
function chunkMarkdown(filename, text) {
  const lines = text.split(/\r?\n/);
  let title = "";
  const sections = [];
  let current = null;

  for (const line of lines) {
    if (line.startsWith("# ")) {
      title = line.slice(2).trim();
      continue;
    }

    if (line.startsWith("## ")) {
      if (current) {
        sections.push(current);
      }
      current = { heading: line.slice(3).trim(), isIntro: false, lines: [line] };
      continue;
    }

    // Lines before the first ## belong to the page intro.
    if (!current) {
      current = { heading: title || "intro", isIntro: true, lines: [] };
    }
    current.lines.push(line);
  }

  if (current) {
    sections.push(current);
  }

  const stem = filename.replace(/\.md$/, "");
  const usedIds = new Set();
  const chunks = [];

  for (const section of sections) {
    let body = section.lines.join("\n").trim();
    if (!body) {
      continue;
    }

    // Keep the page title on the intro so that passage still names the policy.
    if (section.isIntro && title) {
      body = `# ${title}\n\n${body}`;
    }

    const pieces = splitLong(body);
    pieces.forEach((piece, index) => {
      const slug = section.isIntro ? "intro" : slugify(section.heading);
      let id = `${stem}-${slug}`;
      if (pieces.length > 1) {
        id = `${id}-${index + 1}`;
      }
      // Two headings that slugify the same get a numeric suffix.
      if (usedIds.has(id)) {
        let n = 2;
        while (usedIds.has(`${id}-${n}`)) {
          n += 1;
        }
        id = `${id}-${n}`;
      }
      usedIds.add(id);
      chunks.push({ id, source: filename, text: piece });
    });
  }

  return chunks;
}

// loadChunks(onlyFile) → every passage, or just one file when --file is set.
function loadChunks(onlyFile) {
  let filenames = fs
    .readdirSync(docsDir)
    .filter((name) => name.endsWith(".md"))
    .sort();

  if (onlyFile) {
    const name = path.basename(onlyFile);
    if (!filenames.includes(name)) {
      const known = filenames.join(", ");
      console.error(`No file docs/${name}. Known files: ${known}`);
      process.exit(1);
    }
    filenames = [name];
  }

  if (filenames.length === 0) {
    console.error(`No markdown files in ${docsDir}`);
    process.exit(1);
  }

  const chunks = [];
  for (const filename of filenames) {
    const text = fs.readFileSync(path.join(docsDir, filename), "utf8");
    chunks.push(...chunkMarkdown(filename, text));
  }
  return chunks;
}

function printChunks(chunks) {
  for (const chunk of chunks) {
    console.log(`id: ${chunk.id}`);
    console.log(`source: ${chunk.source}`);
    console.log(chunk.text);
    console.log("");
  }
}

if (require.main === module) {
  const onlyFile = readFlag(process.argv, "--file");
  if (process.argv.includes("--file") && !onlyFile) {
    console.error("Usage: node chunk.js [--file <name.md>]");
    process.exit(1);
  }

  const chunks = loadChunks(onlyFile);
  printChunks(chunks);
  const label = chunks.length === 1 ? "passage" : "passages";
  console.log(`${chunks.length} ${label}`);
}

module.exports = { chunkMarkdown, loadChunks };
