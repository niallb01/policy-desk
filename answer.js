// Run the exam. Each question is answered from the closest passages, then
// graded against the key. Pass --id to grade one question. With no flag,
// grade every question and print how many passed.

// pseudo: load helpers, the answer shape, the rules, the grader, and the nearest-passage ranker
const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");
const { zodResponseFormat } = require("openai/helpers/zod");
require("dotenv").config();

const { answerSchema } = require("./models");
const { systemRules, userMessage } = require("./prompt");
const { rankPassages } = require("./search");
const { grade } = require("./score");

const embeddingsPath = path.join(__dirname, "embeddings.json");
const questionsPath = path.join(__dirname, "questions.json");
// Same embedding model as embed.js, so the question sits in the same number space.
const embeddingModel = "text-embedding-3-small";
// A small chat model that can fill the Zod shape instead of free text.
const chatModel = "gpt-4o-mini";
const topPassageCount = 3;

// pseudo: read the question id after --id, or null when the flag is missing
function readId(argv) {
  const index = argv.indexOf("--id");
  if (index === -1 || !argv[index + 1]) {
    return null;
  }
  return argv[index + 1];
}

// pseudo: send the question text → get back its number list
async function embedQuestion(client, text) {
  const response = await client.embeddings.create({
    model: embeddingModel,
    input: text,
  });
  return response.data[0].embedding;
}

// pseudo: rank passages, keep the closest few, and ask the chat model to fill the shape
async function answerQuestion(client, question, records) {
  const questionVector = await embedQuestion(client, question.question);
  const top = rankPassages(questionVector, records).slice(0, topPassageCount);

  const completion = await client.beta.chat.completions.parse({
    model: chatModel,
    messages: [
      { role: "system", content: systemRules() },
      { role: "user", content: userMessage(question.question, top) },
    ],
    response_format: zodResponseFormat(answerSchema, "policy_answer"),
  });

  const parsed = completion.choices[0].message.parsed;
  if (!parsed) {
    throw new Error(`The model returned no parsed answer for ${question.id}.`);
  }
  return parsed;
}

// pseudo: print one pass/fail line, then the answer the model gave
function printLine(question, parsed, result) {
  const mark = result.passed ? "PASS" : "FAIL";
  console.log(
    `${mark}  ${question.id}  refused: ${parsed.refused}  ${result.reason}`,
  );
  console.log(`  ${parsed.answer}`);
}

async function main() {
  // pseudo: load the exam questions (one id, or every question) and the saved passages
  const questions = JSON.parse(fs.readFileSync(questionsPath, "utf8"));
  const id = readId(process.argv);
  let selected = questions;

  if (process.argv.includes("--id")) {
    if (!id) {
      console.error("Usage: node answer.js [--id <question-id>]");
      process.exit(1);
    }
    const question = questions.find((item) => item.id === id);
    if (!question) {
      const known = questions.map((item) => item.id).join(", ");
      console.error(`No question with id "${id}". Known ids: ${known}`);
      process.exit(1);
    }
    selected = [question];
  }

  if (!fs.existsSync(embeddingsPath)) {
    console.error("Missing embeddings.json. Run node embed.js first.");
    process.exit(1);
  }
  const records = JSON.parse(fs.readFileSync(embeddingsPath, "utf8"));

  // pseudo: answer each question, grade it, and tally the passes
  const client = new OpenAI();
  let passed = 0;

  for (const question of selected) {
    const parsed = await answerQuestion(client, question, records);
    const result = grade(question, parsed);
    if (result.passed) {
      passed += 1;
    }
    printLine(question, parsed, result);
  }

  console.log("");
  console.log(`${passed}/${selected.length} passed`);
}

// pseudo: stop early if there is no API key
if (!process.env.OPENAI_API_KEY) {
  console.error(
    "Missing OPENAI_API_KEY. Copy .env.example to .env and add your key.",
  );
  process.exit(1);
}

// pseudo: if anything throws, print the error and exit
main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
