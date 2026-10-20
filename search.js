// Given a question, show the three closest policy passages. No answer yet.
// The model has not spoken. A wrong top passage means a later answer will be wrong.

// pseudo: load helpers, the saved number lists, and the exam questions
const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");
require("dotenv").config();

const embeddingsPath = path.join(__dirname, "embeddings.json");
const questionsPath = path.join(__dirname, "questions.json");
// Same model as embed.js, so the question's numbers live in the same space as the passages.
const model = "text-embedding-3-small";

// pseudo: read the question id after --id, or null when the flag is missing
function readId(argv) {
  const index = argv.indexOf("--id");
  if (index === -1 || !argv[index + 1]) {
    return null;
  }
  return argv[index + 1];
}

// pseudo: how aligned two number lists are, from -1 (opposite) to 1 (same direction)
function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) {
    return 0;
  }
  return dot / denom;
}

// pseudo: send the question text → get back its number list
async function embedQuestion(client, text) {
  const response = await client.embeddings.create({
    model,
    input: text,
  });
  return response.data[0].embedding;
}

// pseudo: score every saved passage against the question, highest first
function rankPassages(questionVector, records) {
  return records
    .map((record) => ({
      id: record.id,
      source: record.source,
      text: record.text,
      score: cosineSimilarity(questionVector, record.vector),
    }))
    .sort((left, right) => right.score - left.score);
}

// pseudo: print the closest few passages with file, score, and text
function printTop(hits, limit) {
  const shown = hits.slice(0, limit);
  shown.forEach((hit, index) => {
    console.log(`#${index + 1}  ${hit.source}  score ${hit.score.toFixed(3)}`);
    console.log(`id: ${hit.id}`);
    console.log(hit.text);
    console.log("");
  });
}

async function searchQuestion(id) {
  // pseudo: load the exam and the saved passages
  const questions = JSON.parse(fs.readFileSync(questionsPath, "utf8"));
  const question = questions.find((item) => item.id === id);
  if (!question) {
    const known = questions.map((item) => item.id).join(", ");
    console.error(`No question with id "${id}". Known ids: ${known}`);
    process.exit(1);
  }

  if (!fs.existsSync(embeddingsPath)) {
    console.error("Missing embeddings.json. Run node embed.js first.");
    process.exit(1);
  }
  const records = JSON.parse(fs.readFileSync(embeddingsPath, "utf8"));

  // pseudo: turn the question into numbers, then rank the saved passages
  const client = new OpenAI();
  const questionVector = await embedQuestion(client, question.question);
  const ranked = rankPassages(questionVector, records);

  console.log(`Question ${question.id}`);
  console.log(question.question);
  console.log("");
  printTop(ranked, 3);
}

if (require.main === module) {
  // pseudo: stop early if there is no API key or no question id
  if (!process.env.OPENAI_API_KEY) {
    console.error(
      "Missing OPENAI_API_KEY. Copy .env.example to .env and add your key.",
    );
    process.exit(1);
  }

  const id = readId(process.argv);
  if (!id) {
    console.error("Usage: node search.js --id <question-id>");
    process.exit(1);
  }

  // pseudo: if anything throws, print the error and exit
  searchQuestion(id).catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { cosineSimilarity, rankPassages };
