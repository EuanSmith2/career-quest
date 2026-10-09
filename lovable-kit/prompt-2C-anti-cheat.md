# Prompt 2C: anti-cheat (send after Prompt 2B works)

Why: with the Prompt 1 rules, `questions` is readable by everyone, so anyone can open dev tools and run
`select answer_letter from questions`. In Live Battle that means reading every answer before the timer starts.
This prompt moves the answers server-side and has the server mark every answer.

Test it afterwards with the checklist at the bottom. Then say it in the pitch: "we red-teamed our own app".

---

Harden the app so the browser never sees a correct answer before the player has answered. Keep every screen, animation and sound exactly as it is; only change where answers live and who marks them.

**1. Move answers out of `questions`**
- New table `question_answers (question_id text primary key references questions(id) on delete cascade, answer_letter text not null check (answer_letter in ('A','B','C','D')), explanation text)`.
- Migrate the existing `answer_letter` and `explanation` values into it, then drop those two columns from `questions`.
- RLS on `question_answers`: enabled, with **no** policies for `anon` or `authenticated`. Only `security definer` functions and Edge Functions using the service role can read it.

**2. Lessons, warm-up and boss: mark answers in Postgres**
- Add `submit_answer(p_question_id text, p_letter text, p_mode text)`, a `security definer` function with `set search_path = public`.
- It looks up the answer, works out the XP on the server (the question's `xp` if correct, 0 if not), inserts the `attempts` row for `auth.uid()`, and returns `{ correct, answer_letter, explanation, xp_earned }`.
- The client keeps shuffling the options. It sends back the **original** letter of the tile the player picked, then shows the result from the function's reply.
- Remove client-side inserts into `attempts`: drop the insert policy, so XP can only come from `submit_answer`.

**3. Live Battle: the server runs the clock and the scoring**
- At join, `join_battle(p_pin text, p_nickname text)` (`security definer`) creates the `battle_players` row and returns `{ player_id, player_token }`, where the token is a random uuid stored in a new `battle_players.token` column. The phone keeps it in localStorage. Never select `token` back to any client.
- When the host shows a question, `start_question(p_battle_id uuid)` (`security definer`, host only):
  - picks a random order of A–D and stores it in a new table `battle_rounds (battle_id, question_index, question_id, option_order text[], started_at timestamptz, revealed bool default false)`
  - sets `battles.state = 'question'` and `question_started_at = now()`
  - Host and players read the order from `battle_rounds`, so everyone sees the same tiles.
- A player taps a tile: `submit_battle_answer(p_player_id uuid, p_token uuid, p_tile int)` (`security definer`). It:
  - checks the token
  - checks the state is `question` and `now() <= started_at + time limit`
  - checks the player has no answer for this round yet
  - maps the tile to a letter through `option_order` and marks it
  - works out `ms_taken` and `points` from the **server** clock
  - inserts `battle_answers` and adds the points to `battle_players.score`
  - returns only `{ locked: true }`. No correctness yet.
- Time up or everyone answered: `reveal_round(p_battle_id uuid)` (`security definer`, host only) sets `revealed = true` and `state = 'reveal'`, and returns the correct tile, the counts per tile and each player's result. Phones fetch their own result through `my_round_result(p_player_id, p_token)`, which only works once `revealed` is true.
- RLS:
  - Clients cannot insert or update `battle_answers` or `battle_players.score` directly.
  - `battle_answers` is readable only after its round is revealed.
  - Only the battle's `host_id` can call the host functions.

**4. Admin import**
- `/admin/import` must not write to the tables from the browser. Move the upsert into an Edge Function `import-questions` that uses the service role and splits each CSV row into `questions` + `question_answers`.
- Only allow it when the caller's email is in the `ADMIN_EMAILS` secret (comma-separated). Return 403 otherwise.

**5. Keep it working**
- The demo round (Prompt 2B), sounds, Byte moods and the Notion sync must behave exactly as before.
- If `question_answers` is empty, show the same red warning style as the demo round: "No answers loaded: run the import."

**Self-test** (add these as a short checklist at `/admin/security`, each with a "Run" button and a pass/fail chip, using the anon client):
1. `select answer_letter from question_answers` returns no rows.
2. `questions` has no `answer_letter` column.
3. A second `submit_battle_answer` for the same round is rejected.
4. An answer sent after the timer is rejected.
5. A direct update of `battle_players.score` is rejected.
