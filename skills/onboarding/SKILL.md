---
name: onboarding
description: First setup of the repo. Asks what presentation is needed, then asks for the brand material (brand guide, logo, colors, fonts, a sample text), derives the company, brand and tone from it, asks only for what is missing, writes company/ and people/, shows a test and then resumes the initial request. Starts when company/profile.md does not exist, or when the user asks to redo or update the onboarding.
---

# Onboarding

The goal: at the end of this conversation the repo knows who the company is, how it looks, how it writes and who is using it. From then on every presentation comes out with the right brand, and nobody has to repeat it.

**Start from zero.** You know nothing about the user or their company: you only know what they write in chat and the files they send you. Do not use local memory, skills or files outside this repo, the session connectors (notetaker, mail, drive, calendar), or the email or name the session is opened with. Do not mention them and do not offer to use them. This holds even if you think you recognize the user.

Speak the user's language. Everything the user reads (chat, slides, outline, extract) is in the user's language. Quotes from a transcript stay in their original language.

It takes five minutes. One step at a time: wait for the answer before moving to the next one.

---

## 1. What presentation do you want to make

Detect the user's language from their first message and use it from then on. If it is unclear, ask once.

If the user's first message already says what presentation they want, skip the question and confirm in one line ("Ok, a progress update after a call with a client").

Note: the messages below are written in English here. Say them in the user's language (the language of the user's first message).

Otherwise open like this:

> Hi. First of all: what presentation do you want to make, and for whom? For example a progress update after a call with a client, a project kickoff, a proposal.

Keep the answer: it is the request to resume at the end of the onboarding.

## 2. Send me your brand

Right after, in a single message:

> To make it with your brand I need your visual identity. Send me what you have, even just part of it:
>
> - **the brand guide**, if there is one: a PDF, a link or a folder;
> - **the logo**: a version for light backgrounds and, if there is one, a version for dark or colored backgrounds (SVG or PNG);
> - **the colors**: the main one and a secondary one, with the code (#1b43a3) or even in words;
> - **the fonts** for headings and body text: the files (.otf, .ttf) or the name;
> - **an email or a message** you sent to a client and that you like, so I can see how you write;
> - **the company website**, if there is one.
>
> To send me a file, drag it here, or tell me where it is. If you do not have something, no problem: I derive it from the rest or I propose something.

## 3. Read and derive

Read everything that arrives, then derive on your own, without asking questions:

- **Company**: name, what it does, who it sells to. From the website, the brand guide, the email.
- **Brand**: logo, colors, fonts, and the rules the guide gives as mandatory ("never", "always", "only"). Those go in "Fixed rules".
- **Tone**: formal or informal address, sentence length, how formal it is, how it opens and how it closes, recurring words. From the email and the guide.

Show a single summary to confirm:

> Here is what I understood:
>
> - **Company**: <name>, <what it does in one sentence>, sells to <whom>.
> - **Colors**: main <#...>, secondary <#...>.
> - **Fonts**: headings in <...>, body text in <...>.
> - **Logo**: <file> on light backgrounds, <file> on the cover.
> - **Fixed rules**: <one per line, or "none">.
> - **Tone**: <formal/informal address>, <three words>.
>
> Is this right? Correct me where needed.

## 4. Ask only for what is missing

After the confirmation, ask in a single message only for what you did not derive, and always:

- first name, last name and role of the person using the repo;
- the contact to put in the closing slide (email or LinkedIn);
- words the company never uses, if you have not already found them.

Rules for fonts:

- **Google Font**: import it in `tokens.css` with `@import url("https://fonts.googleapis.com/css2?family=...")`.
- **Font file** (.otf, .ttf, .woff2): copy it to `company/brand/fonts/` and declare it with `@font-face`.
- **No font**: propose the system font closest to the style of the logo, and say so.

Rules for the logo:

- Copy the files to `company/brand/` with fixed names: `logo.svg` (or `.png`) for light backgrounds, `logo-on-color.svg` (or `.png`) for the cover and the closing slide.
- If there is only one logo, and it is dark, the cover cannot have a colored background. In that case set `--hero: var(--surface)` and `--on-accent: var(--fg)` in `tokens.css`, and use `logo.svg` on the cover too. Tell the user.

---

## What you write

Write all the files at once, at the end of the questions.

In every file below, headings and field names are in English, content is in the user's language (an Italian company's description stays in Italian).

### `company/profile.md`

```markdown
---
name: <Company name>
website: <url or empty>
---

# <Company name>

## What it does
<One or two sentences.>

## Who it sells to
<Type of clients, sectors, markets.>

## How it works with clients
<What it sells: product, service, projects. What a typical project looks like.>
```

### `company/voice.md`

```markdown
# How <Company name> writes

## Register
<Formal or informal address. Formal or informal tone. Three words.>

## Sentences
<Length, structure, how it opens and how it closes.>

## Words to use
- ...

## Words not to use
- ...

## Example
> <the pasted text, unchanged>
```

### `company/brand/brand.md`

```markdown
# <Company name> brand

## Logo
- `logo.svg`: for light backgrounds (inner slides).
- `logo-on-color.svg`: for the cover and the closing slide.

## Colors
| Role | Code | Where |
|---|---|---|
| Main | #... | highlighted headings, numbers, cover |
| Secondary | #... | details, charts |

## Fonts
- Headings and large numbers: <font>
- Body text: <font>

## Fixed rules
- <The rules the brand guide or the user give as mandatory, one per line. Example: "Cover and closing slide: solid black background, never a gradient.">

## Source
<Where this data comes from: brand guide, website, the user's answers.>
```

### `company/brand/tokens.css`

Only the variables that change compared to [`deck-kit/tokens.default.css`](../../deck-kit/tokens.default.css). The others keep their starting values. Usually these are enough:

```css
/* the Google Font @import, if needed, goes first */
:root {
  --accent: #...;
  --accent-2: #...;
  --on-accent: #ffffff;
  --hero: var(--accent);          /* or linear-gradient(120deg, #..., #...) */
  --font-display: "<heading font>", Georgia, serif;
  --font-sans: "<body font>", system-ui, sans-serif;
  --display-weight: 600;
}
```

Every fixed rule on colors also goes in `tokens.css`: if the cover is black, `--hero` is black, not a gradient.

Check the contrast: white text on `--accent` must be readable. If the main color is light (yellow, light aqua green), use `--on-accent: var(--fg)`.

### `people/<first-last>.md`

```markdown
---
name: <First Last>
role: <role>
contact: <email or LinkedIn, to put in the closing slide>
language: <the user's language as an ISO code, e.g. it, en, es>
---

# <First Last>

## What they do with clients
<One line.>

## How they write
<If different from the company tone: what changes. Otherwise: "Same as company/voice.md".>
```

The `language:` field is used to start later sessions in the right language.

The file name is the first and last name in lowercase, with a hyphen: `mario-rossi.md`.

---

## The test

Right after writing the files:

1. Create the folder with `node deck-kit/prepare.js brand-test` and write `~/Downloads/brand-test/index.html` starting from the template you find there, with three slides: the cover with the company name, an inner slide with three cards that sum up what the company does, the closing slide with the person's name and role. Set `<html lang>` to the user's language code and write the slides in their language.
2. Run `node deck-kit/check-layout.js ~/Downloads/brand-test/index.html`. If `deck-kit/node_modules` does not exist, first run `cd deck-kit && npm install`.
3. Open the file in the browser and ask:

> Here is how your slides come out. Are the logo, colors and fonts right, or should I correct something?

Correct `company/brand/` until the user says it is fine. Then resume the request from step 1:

> Perfect, on the brand side we have everything we need and I will not ask you again. Now I need the meeting: upload the transcript, by dragging the notetaker file here or pasting the text, or tell me where to find it.

When it arrives, follow [`CLAUDE.md`](../../CLAUDE.md) from point 2b.
