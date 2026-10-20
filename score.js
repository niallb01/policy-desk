// Grade one reply against the answer key from Milestone 2.
// The model does not decide what "correct" means.
// A pass is a refusal when the pages have no answer, or an answer from the
// right page that includes the required fact. A fail is a bad retrieval or
// a model that talked past the passages.

const path = require("path");

// pseudo: same page if the filenames match, whether or not one includes docs/
function samePage(cited, expected) {
  if (!cited || !expected) {
    return false;
  }
  return path.basename(cited) === path.basename(expected);
}

// pseudo: true when any citation names the page the key expects
function citesSource(citations, sourceFile) {
  return citations.some((citation) => samePage(citation.source_file, sourceFile));
}

// pseudo: true when the required fact appears in the answer, ignoring letter case
function mentionsFact(answer, fact) {
  return answer.toLowerCase().includes(fact.toLowerCase());
}

// pseudo: if the key says refuse, pass only on a refusal; otherwise require a real answer, the right page, and the required fact
function grade(question, parsed) {
  const expected = question.expected;

  if (expected.should_refuse) {
    if (parsed.refused) {
      return { passed: true, reason: "refused, as the key requires" };
    }
    return {
      passed: false,
      reason: "answered, but the key says this question must be refused",
    };
  }

  if (parsed.refused) {
    return {
      passed: false,
      reason: "refused, but the key says the pages contain this answer",
    };
  }

  if (!citesSource(parsed.citations, expected.source_file)) {
    const cited =
      parsed.citations.map((citation) => citation.source_file).join(", ") ||
      "none";
    return {
      passed: false,
      reason: `cited ${cited}, expected ${expected.source_file}`,
    };
  }

  if (!mentionsFact(parsed.answer, expected.must_mention)) {
    return {
      passed: false,
      reason: `answer did not mention "${expected.must_mention}"`,
    };
  }

  return {
    passed: true,
    reason: `${expected.source_file}, mentions "${expected.must_mention}"`,
  };
}

module.exports = { grade };
