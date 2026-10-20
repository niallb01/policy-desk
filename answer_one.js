// Answer one exam question from the closest policy passages.
// The model sees those passages only. It must cite one, or refuse.

// pseudo: load helpers, the answer shape, the rules, and the nearest-passage scorer
const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");
const { zodResponseFormat } = require("openai/helpers/zod");
require("dotenv").config();

const { answerSchema } = require("./models");
const { systemRules, userMessage } = require("./prompt");
const { rankPassages } = require("./search");

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

// pseudo: print the parsed reply, then the passage text each citation points at
function printAnswer(parsed, passages) {
  console.log(`refused: ${parsed.refused}`);
  console.log(`answer: ${parsed.answer}`);

  if (parsed.citations.length === 0) {
    console.log("citations: none");
    return;
  }

  console.log("citations:");
  parsed.citations.forEach((citation) => {
    console.log(`- ${citation.source_file}  ${citation.passage_id}`);
    const passage = passages.find((item) => item.id === citation.passage_id);
    console.log("");
    console.log("Cited passage:");
    if (!passage) {
      console.log("(that passage id was not among the passages sent to the model)");
      return;
    }
    console.log(`${passage.source}`);
    console.log(passage.text);
    console.log("");
  });
}

async function answerOne(id) {
  // pseudo: load the exam question and the saved passages
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

  // pseudo: rank passages, keep the closest few, and ask the chat model to fill the shape
  const client = new OpenAI();
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
    console.error("The model returned no parsed answer.");
    process.exit(1);
  }

  console.log(`Question ${question.id}`);
  console.log(question.question);
  console.log("");
  printAnswer(parsed, top);
}

// pseudo: stop early if there is no API key or no question id
if (!process.env.OPENAI_API_KEY) {
  console.error(
    "Missing OPENAI_API_KEY. Copy .env.example to .env and add your key.",
  );
  process.exit(1);
}

const id = readId(process.argv);
if (!id) {
  console.error("Usage: node answer_one.js --id <question-id>");
  process.exit(1);
}

// pseudo: if anything throws, print the error and exit
answerOne(id).catch((err) => {
  console.error(err.message);
  process.exit(1);
});
