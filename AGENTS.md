# presentation-agent

This repo turns the transcript of a client meeting into an HTML presentation ready to send, with your company's brand and tone of voice.

Read this file at the start of every session, before answering any request.

`CLAUDE.md` and `AGENTS.md` are the same file, one for Claude Code and one for the other agents. If you change one, copy the change into the other.

---

## 0. Rule zero: only this repo counts

You work only with the files in this folder and with what the user writes or sends you in the chat.

- Do not read files outside this folder unless the user gives them to you.
- Do not use local memory, skills installed outside this repo, or the session's connectors (notetaker, mail, drive, calendar, CRM).
- Do not guess who the user is from the email or the name the session runs under.
- Do not mention any of this and do not offer to use it.

If a piece of information is not in the repo and the user has not given it to you, you do not know it: ask.

**Speak the user's language.** The files of this repo are in English, but you talk to the user in their language: the `language:` field in their `people/` file or, before that file exists, the language of their first message. If you cannot tell, ask once. Everything the user reads is in their language too: chat, outline, extract, slides, brand test. The deck's `<html lang>` is set to the same language code, so the review buttons appear in that language. Quotes from a transcript stay in the language they were spoken in.

**Files you write in the repo:** headings and field names in English, content in the user's language. A transcript stays exactly as it arrived.

**Every artifact you produce goes in `~/Downloads/`.** Presentations, extracts, PDFs, brand tests: all in a folder under `~/Downloads/`, created with `node deck-kit/prepare.js <folder-name>`. It is the only place outside the repo you write to. When you deliver, always give the full path.

---

## 1. Is it the first time?

Check whether `company/profile.md` exists.

- **It does not exist.** It is the first time. Read [`skills/onboarding/SKILL.md`](skills/onboarding/SKILL.md) and follow the onboarding from the start. Do not generate any presentation until the onboarding is done.
- **It exists.** Go to step 2.

## 2. Load the context

Read, in this order:

1. `company/profile.md`: who the company is, what it does, who it sells to.
2. `company/voice.md`: how the company writes.
3. `company/brand/brand.md`: logo, colors, fonts.
4. The `people/` file of the person working. If there is more than one file in `people/`, ask "Who are you?" and use the right one.

Then ask, in a single question, for whatever is missing between presentation type and meeting. Say it in the user's language:

> What presentation do you need? Upload the meeting transcript, by dragging the file here or pasting the text, or tell me where to find it.

If the meeting is already in `meetings/`, the user only has to point to it.

## 2b. When a transcript arrives

1. **Save it** in `meetings/YYYY-MM-DD_<client>.md`, starting from [`meetings/_template.md`](meetings/_template.md): a header with date, client, type, participants and source, then the link to the client, then the transcript text **as it is**, without correcting or summarizing it. Take date, client and participants from the transcript.
2. **The client.** If `clients/<client>.md` exists, read it. If it does not, create it from [`clients/_template.md`](clients/_template.md) with what the transcript says: who they are, what they do with you, goal and dates, people and roles. What the transcript does not say stays empty.
3. **Show in a single message** what you saved and the client profile, and ask the user to confirm or complete it. Then go to step 4.

If the user already said everything in the request, do not ask again.

## 3. Where things are

| Folder | What it holds |
|---|---|
| `company/` | Your company: `profile.md`, `voice.md`, `brand/` (logo, colors, fonts). Written by the onboarding. |
| `people/` | Who uses the repo: role, language and how they write. One file per person. |
| `clients/` | One file per client: `clients/<client>.md`. Who they are, what they buy, who the people are. |
| `meetings/` | One file per meeting: `meetings/YYYY-MM-DD_<client>.md`. The notetaker transcript, with the link to the client. |
| `skills/` | The instructions for each job: the onboarding and one presentation type per folder. |
| `deck-kit/` | The slide engine: style, navigation, layout check, PDF export. |
| `examples/` | Finished presentations, kept as a reference. |

Meetings and clients are separate. A meeting points to its client with the `client:` field and a link in the text. To find all the meetings of a client, search `meetings/` for files with `client: <client>`.

## 4. How a presentation is built

1. **Pick the skill for the presentation type.**
   - Progress update: [`skills/deck-progress-update/SKILL.md`](skills/deck-progress-update/SKILL.md)
   - **A type that does not exist yet** (kickoff, proposal, anything else): say so in one line and offer to create the skill together. Copy `skills/deck-progress-update/` to `skills/deck-<type>/`, ask the user what each slide must say and rewrite the outline. Then add the type to this list, in `CLAUDE.md` and in `AGENTS.md`, and generate the presentation with the new skill. Never build a presentation without its skill.
2. **Read the meeting**, then open the client from the link. Also read the other meetings with the same client, most recent first: they tell you where you left off.
3. **Outline first, then slides.** Propose the list of slides, one line per slide, with the title you will use. Wait for the ok. If the user says "go straight", skip the wait.
4. **Build the HTML** following [`deck-kit/README.md`](deck-kit/README.md). First create the folder with `node deck-kit/prepare.js <client>_<type>_<YYYY-MM-DD>`: the presentation is `~/Downloads/<folder>/index.html`.
5. **Check the layout** before showing it: `node deck-kit/check-layout.js ~/Downloads/<folder>/index.html`. If it is not clean, fix and run it again. Never show a presentation that does not pass the check.
6. **Deliver.** Give the path of the file and ask whether they also want the PDF. The PDF comes only at the end, on request.

## 5. Slide rules

- **The title states the message, not the topic.** "New website: 8 pages out of 12 live", not "Status update".
- **Every number, name and date comes from a file.** From the meeting, the client or the company. Never make anything up. If a fact the slide must state is missing (a delivery date, a number in the title), write `[TO VERIFY]` in its place, in the user's language. If a side detail is missing, remove it from the slide and add it to "To verify" in the extract. In both cases, say so when you deliver.
- **One thing per slide.** If a slide has to say two things, it is two slides.
- **The text follows `company/voice.md`.** The client's words stay theirs: if in the meeting they say "pages", write "pages".
- **Colors, fonts and logo come only from `company/brand/`.** Never a color or a font written by hand in the HTML.
- **The fixed rules in `company/brand/brand.md` apply to every slide.** They win over any example in this repo and over any style request of the moment. If a request contradicts them, say so before doing it.

## 6. What not to do

- Do not change files that already exist in `company/`, `people/` or `clients/` while generating a presentation. If you find wrong or missing data, say so and ask whether to update it. Creating the file of a new client (step 2b) is allowed.
- Do not change the text of the transcripts in `meetings/`: they stay as they arrived.
- Artifacts go only in `~/Downloads/`. In the repo you write only during the onboarding (`company/`, `people/`), when you save a transcript or a new client (step 2b) and when you create the skill for a new type with the user (step 4).
