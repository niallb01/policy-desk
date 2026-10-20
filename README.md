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

Later steps turn those pages into short passages, find the closest passage for a question, and either answer from that passage or refuse. The exam questions are written before the model runs, so the model does not decide what “correct” means.

**Milestone 3 — load the files:** `load_docs.js` reads every markdown file in `docs/` from disk and prints each filename with the first non-empty line as a preview, so you can see exactly what text the program has before any search or AI step. Run `node load_docs.js`; you should see all five policy pages listed with their title lines. Nothing is embedded or sent to an API yet—the step only proves the raw policy material is reachable as plain text.

## Secrets

This repository is public. API keys stay in a local `.env` file, which git ignores.

```bash
cp .env.example .env
```

Put `OPENAI_API_KEY` in `.env`. Do not commit that file. The example file has the variable name and an empty value.
