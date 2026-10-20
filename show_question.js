const fs = require("fs");
const path = require("path");

function readId(argv) {
  const index = argv.indexOf("--id");
  if (index === -1 || !argv[index + 1]) {
    return null;
  }
  return argv[index + 1];
}

const id = readId(process.argv);
if (!id) {
  console.error("Usage: node show_question.js --id <question-id>");
  process.exit(1);
}

const filePath = path.join(__dirname, "questions.json");
const questions = JSON.parse(fs.readFileSync(filePath, "utf8"));
const question = questions.find((item) => item.id === id);

if (!question) {
  const known = questions.map((item) => item.id).join(", ");
  console.error(`No question with id "${id}". Known ids: ${known}`);
  process.exit(1);
}

const expected = question.expected;

console.log(`Question ${question.id}`);
console.log(question.question);
console.log("");

if (expected.should_refuse) {
  console.log(
    "Expected: refuse. The policy files do not contain this answer, so a correct reply says so and stops."
  );
  console.log("Source file: none");
  console.log("Required fact: none");
} else {
  console.log(
    "Expected: answer this from the policy files. A correct reply uses the source below and includes the required fact."
  );
  console.log(`Source file: ${expected.source_file}`);
  console.log(`Required fact: ${expected.must_mention}`);
}
