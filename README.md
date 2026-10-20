# Policy desk

A support agent asks a question. This program answers only from Northline’s own policy pages, and it shows the passage it used. If those pages do not contain the answer, it says so and stops.

Northline is a fictional B2B company. The pages in `docs/` are the only knowledge the app is allowed to use.

## Why this exists

Agents look up the same rules over and over: refund windows, plan prices, uptime targets, when to escalate. A wrong refund or a promised uptime the company does not offer costs money. A citation lets a person check the sentence. A refusal stops the model inventing a policy that was never written down.

## What is in the repo now

Five short policy pages:

| File | What an agent looks up |
| --- | --- |
| `docs/refunds.md` | When an annual or monthly charge can be refunded |
| `docs/plans-and-sla.md` | Plan prices, support hours, and uptime targets |
| `docs/billing.md` | Invoices, failed payments, and duplicate charges |
| `docs/escalation.md` | When a ticket goes to engineering |
| `docs/auth-403-runbook.md` | What to do when many users get HTTP 403 after a release |

Later steps find the closest passage for a question, then either answer from that passage or refuse. The exam questions are written before the model runs, so the model does not decide what “correct” means.

**Milestone 3 — load the files:** `load_docs.js` reads every markdown file in `docs/` from disk and prints each filename with the first non-empty line as a preview, so you can see exactly what text the program has before any search or AI step. Run `node load_docs.js`; you should see all five policy pages listed with their title lines. Nothing is embedded or sent to an API yet—the step only proves the raw policy material is reachable as plain text.

**Milestone 4 — chunk the text:** `chunk.js` splits each page on its headings into short passages and prints each passage’s id, source file, and text. Run `node chunk.js` for every page, or `node chunk.js --file refunds.md` for one file. Search later points at one of these passages. A citation is one passage, not a whole file.

**Milestone 5 — turn passages into number lists:** `embed.js` sends each passage to the embeddings API and saves `embeddings.json`. Each row is the passage id, the source file, the text, and a list of numbers. Run `npm install`, put `OPENAI_API_KEY` in `.env`, then `node embed.js`. You should see the saved file, how many passages were embedded, and the length of one number list. Similar passages get similar lists. This call is paid once; later steps read the file.

**Milestone 6 — find the nearest passages:** `search.js` turns one exam question into the same kind of number list, then compares it with every saved passage. The comparison is a plain score: 1 means the lists point the same way, and a lower score means they are less alike. It prints the three closest passages with the filename, the score, and the text. Run `node search.js --id refund-annual` and a refunds passage should be on top. Run `node search.js --id competitor-pricing` and the top passages should be off-topic or weakly related, because the pages never mention that competitor. Nothing has written an answer yet. This step only shows which passages a later answer would be allowed to use.

## Secrets

This repository is public. API keys stay in a local `.env` file, which git ignores.

```bash
cp .env.example .env
```

Put `OPENAI_API_KEY` in `.env`. Do not commit that file. The example file has the variable name and an empty value.
