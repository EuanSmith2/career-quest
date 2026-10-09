# Prompt 2B: Demo round (send after Prompt 2 works)

Add a **"Demo round"** choice at the top of the career picker on `/host`, above "Mixed".

- It uses exactly these question ids, in this order, with no random picking:
  `IT003, NS003, MA005, AI001, PT011, MA006, AI010, SA014, AI012, AI017`
- Length options for the demo round: **3** (for the pitch: first three ids) or **10** (the full set).
- Still shuffle the four answer options each time, as everywhere else.
- Timer 20 seconds per question.
- If any of those ids is missing from the `questions` table, show a red warning on `/host` listing the missing ids instead of starting.

Why: in the full bank the correct answer is often the longest option, so a random pick can be gamed by choosing the longest answer. These ten were checked: the correct answer is never the longest one.
