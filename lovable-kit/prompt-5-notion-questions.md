# Prompt 5: Notion is where questions are edited (send after Prompt 4 works; needs Prompt 2C)

Why: Prompt 4 makes Notion a place progress goes *to*. This makes Notion the place the app's content comes *from*:
edit a question in Notion, press sync, and the battle shows the new version. It's a live sponsor moment in the pitch.

**Before sending:**
1. In Notion, open the **Questions** database (under "Career Quest — Start Here"), then ••• → Connections → add the same integration as Prompt 4.
2. In Lovable, add the secret `NOTION_QUESTIONS_DB_ID` = `f2fdbc27481f487dbfb9d4486cfc177a`.
3. Optional: get all 480 into Notion with ••• → Merge with CSV → `share/questions-notion.csv`. Its headers already match the database's property names. The 10 demo questions are already there, so skip this if time is short.

**Pitch beat (30s):** open the Questions database next to the host screen → change the wording of IT003 (the first demo question) →
press "Sync from Notion" → start the 3-question demo round → the new wording is on screen.
Line: "Teachers and societies write the questions in Notion. Career Quest turns them into lessons and live battles."

---

Make the Notion **Questions** database a second source of questions, synced into Supabase.

**Edge Function `sync-questions-from-notion`**
- Uses the `NOTION_TOKEN` and `NOTION_QUESTIONS_DB_ID` secrets, and only runs for emails in `ADMIN_EMAILS`.
- Queries the database with the Notion API (`POST /v1/databases/{id}/query`, header `Notion-Version: 2022-06-28`) and follows `next_cursor` until all pages are read.
- Maps the Notion properties to our columns:

| Notion property (type) | Column |
|---|---|
| QID (text) | `questions.id` |
| Question (title) | `question` |
| Career Slug (text) | `career_slug` (must exist in `careers`) |
| Career (select) | `career` |
| Difficulty (select: easy / medium / hard) | `difficulty` |
| XP (number) | `xp` |
| Option A … Option D (text) | `option_a` … `option_d` |
| Answer (select: A–D) | `question_answers.answer_letter` |
| Explanation (text) | `question_answers.explanation` |
| Source (text) | `source` |
| Demo (checkbox) | new column `questions.demo bool default false` |

- Join all the text fragments of each rich-text property into one string.
- Upserts into `questions` and `question_answers` with the service role. Answers never pass through the browser.
- Skips any row missing QID, Question, any option, Answer or Career Slug, or whose Career Slug doesn't exist. Doesn't delete questions that aren't in Notion.
- Returns `{ upserted, skipped: [{ qid, reason }], synced_at }` and stores `synced_at` and the counts in a one-row table `notion_sync_status`.

**UI**
- On `/admin` and on `/host`: a **"Sync from Notion"** button with the Notion logo. Next to it: "Last synced 2 min ago · 10 questions", and a small list of skipped rows if there are any.
- On `/host`, the Demo round uses the questions where `demo = true`, in the Prompt 2B id order. Fall back to the fixed id list if none are flagged.
- In `/admin`, each question row gets an **"Edit in Notion"** link for rows that came from Notion. Store the Notion page URL in a new `questions.notion_url` column.
- Toast after sync: "Synced 10 questions from Notion".

**Keep it working:** CSV import still works, and the last write wins. The Prompt 4 progress sync is unchanged.
