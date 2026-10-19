# Policy desk — incremental build

**Location:** `Desktop/ai learning path/policy-desk/`
**Separate from:** `ticket-extractor/` and `ticket-extractor-learn/`. This folder does not import either of them.
**Git:** local only — no push unless you choose to later
**Language:** JavaScript (Node). Same ideas as a Python version: load files, call the API, save JSON. The ticket extractor stays Python.

**Rule:** One milestone per session. Run the “You run” command and confirm output before the next milestone.

**What this is:** A support agent asks a question. The program answers only from this company’s own policy files, and it shows the passage it used. If the files do not contain the answer, it says so and stops.

**Why a company would care:** Repeat policy lookups cost agent time. A wrong refund or a wrong uptime promise costs money. The citation lets a person check the sentence. The refusal is what stops the model inventing a policy. The cost figure in a later README is an illustration for a team this size, not a measured saving.

**Story link only:** One runbook covers the same kind of auth incident as `auth-403` in the ticket extractor. The code stays independent.

**Finished shape:** Node, direct API calls, no framework, no hosted vector database. Files in, chunks, embeddings saved locally, nearest passages, one grounded answer with a citation, then a pass/fail score against questions written beforehand.

---

## Milestone 0 — Folder + map (this file)

**Purpose:** Agree on the path before any code.

**Deliverables:** This folder, `MILESTONES.md`.

**You run:** Nothing yet.

**You should understand:** The journey is files → chunks → number lists → nearest passage → answer or refusal → PASS/FAIL. The exam questions are written before the model runs.

---

## Milestone 1 — The company files

**Purpose:** See the only knowledge the app is allowed to use. No code, no AI.

**Files to add:**
- `docs/refunds.md`
- `docs/plans-and-sla.md`
- `docs/billing.md`
- `docs/escalation.md`
- `docs/auth-403-runbook.md`

Short pages for a fictional B2B company, Northline. Each page is a few headings and plain rules an agent would look up.

**You run:**
```bash
cd "/Users/niallbennett/Desktop/ai learning path/policy-desk"
ls docs
```
Then open one file and read it.

**You should see:** Five markdown files.

**You should understand:** Later answers can only come from these pages. If a rule is not written here, the app must not invent it.

---

## Milestone 2 — Questions and answer keys

**Purpose:** Write the exam before any retrieval or model call.

**Files to add:**
- `questions.json` — about eight questions. Each has an `id`, the `question`, and an `expected` block:
  - `should_refuse`: true or false
  - `source_file`: which doc must be cited, or null when refusing
  - `must_mention`: a short fact the answer has to include, or null when refusing

Include at least two questions the docs cannot answer.

**Files to add:**
- `show_question.js` — print one question by `--id` and its expected fields in plain English.

**You run:**
```bash
node show_question.js --id refund-annual
node show_question.js --id competitor-pricing
```

**You should see:** One answerable question with its source file and required fact, and one question marked refuse.

**You should understand:** The answer key is human-written. The model is graded against it later. It does not get to decide what “correct” means.

---

## Milestone 3 — Load the files

**Purpose:** Read the docs from disk and print what the program actually sees.

**Files to add:**
- `load_docs.js` — read every `.md` file in `docs/`, print the filename and the first line of each.

**You run:**
```bash
node load_docs.js
```

**You should see:** Five filenames, each with a one-line preview.

**You should understand:** The raw material is text loaded from files. Nothing is embedded yet.

---

## Milestone 4 — Chunk the text

**Purpose:** Split each file into passages the search can point at.

**Files to add:**
- `chunk.js` — split on headings (or a fixed size with a small overlap if a section is long). Print each chunk’s id, source filename, and text.

**You run:**
```bash
node chunk.js
node chunk.js --file refunds.md
```

**You should see:** A list of short passages, each tied to the file it came from.

**You should understand:** Search runs on passages, not on a whole file. A citation later is one of these passages.

---

## Milestone 5 — Turn passages into number lists

**Purpose:** Call the embeddings API once per chunk and save the result locally.

**Files to add:**
- `.env.example`, `.gitignore` (include `.env`)
- `package.json` — `openai`, `dotenv`
- `embed.js` — embed every chunk, write `embeddings.json` (chunk id, source file, text, vector)

**You run:**
```bash
npm install
cp .env.example .env   # add OPENAI_API_KEY
node embed.js
```

**You should see:** A saved file, a chunk count, and the length of one vector (a list of floats, not words).

**You should understand:** An embedding is a list of numbers for one passage. We pay for this once, then reuse the file. Similar passages get similar lists. This is the first network call.

---

## Milestone 6 — Find the nearest passages

**Purpose:** Given a question, show the closest chunks. No answer yet.

**Files to add:**
- `search.js` — embed the question, compare it with the saved vectors (cosine similarity in plain JavaScript), print the top three chunks with filename, score, and text.

**You run:**
```bash
node search.js --id refund-annual
node search.js --id competitor-pricing
```

**You should see:** For the refund question, a refunds passage on top. For the competitor question, weak or unrelated passages — the docs do not contain that answer.

**You should understand:** “Vector search” here is nearest-passage. The model has not spoken. A wrong top passage means the answer will be wrong later, so this is the step to inspect.

---

## Milestone 7 — One grounded answer

**Purpose:** Send only the retrieved passages plus the question. Require a citation, or a refusal.

**Files to add:**
- `models.js` — Zod shape: `answer`, `refused` (bool), `citations` (source file + passage id)
- `prompt.js` — system rules: use only the passages, cite them, refuse if they do not contain the answer
- `answer_one.js --id refund-annual` — search, build the request, call the chat model, print the parsed result and the cited passage

**You run:**
```bash
node answer_one.js --id refund-annual
```

**You should see:** A short answer, `refused: false`, and the refunds passage it used.

**You should understand:** The model does not see the whole `docs/` folder. It sees the few passages search returned, and the schema forces a citation or a refusal flag.

---

## Milestone 8 — Score the set

**Purpose:** Grade every question against the key from Milestone 2.

**Files to add:**
- `score.js` — pass/fail rules:
  - if `should_refuse` is true, the answer must refuse
  - otherwise `refused` is false, `source_file` matches, and `must_mention` appears in the answer (wording around it can differ)
- `answer.js` — loop all questions, optional `--id`, print a line each and a final count

**You run:**
```bash
node answer.js --id competitor-pricing
node answer.js
```

**You should see:** The competitor question refuses. The full run prints `N/M passed`.

**You should understand:** The product is the score, not a single impressive answer. A pass means the right source or a correct refusal. A fail is either a bad retrieval or a model that talked past the passages.

---

## Session checklist (every time)

1. Read **Purpose** + **You should understand** for this milestone only.
2. I add **only** the files listed for that milestone.
3. You run the command; paste output if something looks off.
4. Say **“Milestone N done”** before asking for N+1.

## When you’re ready to build

Say: **“Start Milestone 1”** — we will not skip ahead.
