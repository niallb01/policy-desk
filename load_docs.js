// Read every markdown file in docs/ and print the filename plus its first line.

const fs = require("fs");
const path = require("path");

const docsDir = path.join(__dirname, "docs");

// List .md files only, in a stable order, so the printout is the same each run.
const filenames = fs
  .readdirSync(docsDir)
  .filter((name) => name.endsWith(".md"))
  .sort();

if (filenames.length === 0) {
  console.error(`No markdown files in ${docsDir}`);
  process.exit(1);
}

for (const filename of filenames) {
  const filePath = path.join(docsDir, filename);
  const text = fs.readFileSync(filePath, "utf8");
  const firstLine = text.split(/\r?\n/).find((line) => line.trim() !== "") || "(empty file)";

  console.log(filename);
  console.log(firstLine);
  console.log("");
}
