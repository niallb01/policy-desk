// The instructions the chat model sees. It is given a few passages, not the
// whole docs folder. It must quote one of those passages, or say the pages
// do not contain the answer.

// pseudo: standing rules — use only these passages, cite one, or refuse
function systemRules() {
  return [
    "You answer a support question using only the policy passages in the user message.",
    "Do not use outside knowledge. Do not invent a policy that is not written in those passages.",
    "If the passages contain the answer, set refused to false, write a short answer, and cite the passage id and source file you used.",
    "If they do not contain the answer, set refused to true, set citations to an empty list, and say the policy pages do not contain the answer.",
  ].join(" ");
}

// pseudo: pack the question and the retrieved passages into the user message
function userMessage(question, passages) {
  const blocks = passages.map((passage) => {
    return [
      `passage_id: ${passage.id}`,
      `source_file: ${passage.source}`,
      passage.text,
    ].join("\n");
  });

  return [`Question: ${question}`, "", "Passages:", "", blocks.join("\n\n")].join(
    "\n",
  );
}

module.exports = { systemRules, userMessage };
