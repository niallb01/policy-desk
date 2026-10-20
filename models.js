// The shape every reply must have. The model fills this in; it cannot
// return a free-form paragraph. A citation names the file and the passage.
// A refusal is a yes/no flag, so a missing policy is not written as a guess.

// pseudo: load Zod, the checker that accepts only this shape
const { z } = require("zod");

// pseudo: one citation is the source file plus the passage id from search
const citationSchema = z.object({
  source_file: z.string(),
  passage_id: z.string(),
});

// pseudo: every reply is a short answer, refused yes or no, and the citations used
const answerSchema = z.object({
  answer: z.string(),
  refused: z.boolean(),
  citations: z.array(citationSchema),
});

module.exports = { answerSchema, citationSchema };
