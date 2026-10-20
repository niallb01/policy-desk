// Turn each passage into a list of numbers and save it.
// This is the first network call. Later steps read embeddings.json
// instead of paying the API again.

// pseudo: load helpers (files, paths, OpenAI, secret key from .env)
const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");
require("dotenv").config();

// pseudo: reuse chunk list from milestone 4; pick output file and embedding model
const { loadChunks } = require("./chunk");

const outPath = path.join(__dirname, "embeddings.json");
// A small, cheap model. It returns a list of floats, not words.
const model = "text-embedding-3-small";

// pseudo: send one passage text → get back its number list
async function embedChunk(client, chunk) {
  const response = await client.embeddings.create({
    model,
    input: chunk.text,
  });
  return response.data[0].embedding;
}

async function main() {
  // pseudo: stop early if there is no API key
  if (!process.env.OPENAI_API_KEY) {
    console.error("Missing OPENAI_API_KEY. Copy .env.example to .env and add your key.");
    process.exit(1);
  }

  // pseudo: get all passages; open API client; start empty result list
  const chunks = loadChunks();
  const client = new OpenAI();
  const records = [];

  // pseudo: for each passage, embed it and remember id + file + text + numbers
  for (const chunk of chunks) {
    const vector = await embedChunk(client, chunk);
    records.push({
      id: chunk.id,
      source: chunk.source,
      text: chunk.text,
      vector,
    });
    console.log(`embedded ${chunk.id}`);
  }

  // pseudo: write the full list to embeddings.json on disk
  fs.writeFileSync(outPath, JSON.stringify(records, null, 2));

  // pseudo: print a short summary so you know it worked
  console.log("");
  console.log(`saved: ${path.basename(outPath)}`);
  console.log(`chunks: ${records.length}`);
  console.log(`vector length: ${records[0].vector.length}`);
}

// pseudo: if anything throws, print the error and exit
main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
