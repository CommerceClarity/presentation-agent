---
name: deck-progress-update
description: Builds the progress update deck after a client call, starting from the transcript in meetings/. Five slides: cover, where we left off, closed activities with their numbers, what is blocked and what we need from the client, next steps with owner and date. Use it when the user asks for a progress update, a status update, a project status report or an update for the client.
---

# Progress update

The deck you send the client after the progress call. The client reads it in two minutes and knows three things: what was done, what you are waiting for from them, what happens between now and the next meeting.

You redo it after every call, so it must come out the same every time: same five slides, same order. Only the content changes.

**Language.** These instructions are in English. The extract, the outline you show the user and all slide text are written in the user's language (the `language:` field in their people/ file, or the language they write in). Set `lang` on the deck's `<html>` tag to that language code: the deck UI buttons read it. The client's own words stay as they said them. Every example title, label, outline message and extract line below is an example: write it in the user's language.

---

## 1. Read

1. The requested meeting in `meetings/`.
2. The client, from the link in the meeting: `clients/<client>.md`.
3. The previous meeting with the same client (search `meetings/` for `client: <client>` and take the date just before). You need it for slide 2: what you committed to close by today. If there is none, take the commitment from how the meeting itself recalls it ("let's start from what we agreed"). If it is not said there either, it goes in "To verify".
4. `company/voice.md` for the tone.

## 2. Extract, before writing any slide

The real work is here. A summary of the meeting is not enough: you need precise facts, one by one, each with the transcript sentence it comes from.

Create the folder with `node deck-kit/prepare.js <client>_progress-update_<YYYY-MM-DD>` and write `~/Downloads/<folder>/extract.md` with these sections:

```markdown
# Extract: <Client>, meeting of <YYYY-MM-DD>

## Project goal
- <one line> (source: clients/<client>.md)

## Today's commitment and outcome
- Commitment: <the macro activity promised for this call> (source: meeting of <previous date>, or "<transcript sentence that recalls it>")
- Outcome: done / partly / not done, why (source: "<transcript sentence>")

## Closed activities
| Activity | Number | Source |
|---|---|---|
| <what> | <how much: pieces, %, days, euros> | "<transcript sentence>" |

## Blockers
| What is missing | Who must provide it | Since when | What it blocks | Source |
|---|---|---|---|---|

## Next steps
| Activity | Owner | Date | Source |
|---|---|---|---|

## Next meeting
- <date> : <the macro activity to close by that day> (source: "<sentence>")

## To verify
- <every data point you need that the transcript does not state with certainty>
```

Extract rules:

- **Every line has its source.** A transcript sentence in quotes, or the file it comes from.
- **Numbers are copied, not estimated.** If someone in the meeting says "more or less 300", write "about 300". If there is no number, leave it empty and put it in "To verify".
- **Owner and date for every next step.** If the meeting does not give them, put them in "To verify". Do not assign an owner yourself.
- **A client blocker also becomes a next step**, with an owner on the client side and the date by which it is needed.
- **The client's words stay theirs.** If they say "pages", write "pages", not "screens".

## 3. The outline

Show the user the five titles and the "To verify" items, in a single message. Example:

> 1. Cover: Rossi Furniture, new website, 12 March 2026
> 2. Design approved: now the content
> 3. 8 pages out of 12 live in test, speed under 2 seconds
> 4. To close the 4 missing pages we need the product photos
> 5. Six activities between now and 26 March, three are yours
>
> To verify: the delivery date for the photos was not stated.

Wait for the ok, unless the user said "go straight ahead".

## 4. The five slides

There are five slides and the fifth is the last: no closing slide, even if the template has one.

Footer of every inner slide: `<Client> · Progress update` on the left (in the user's language), page number on the right.

The title of every slide states the message. "8 pages out of 12 live in test", not "Activities carried out".

### Slide 1. Cover

`.slide.cover`

- `.k`: `<Company> × <Client>`
- `h1`: the project and the message of the day in one sentence. Example: "New website: eight pages out of twelve are ready".
- `.lead`: the period covered ("Progress from 26 February to 12 March").
- `.cover-meta`: "Progress update" on the left, the meeting date on the right.

### Slide 2. Where we left off

`.slide.page`, eyebrow "Where we left off".

Three lines, no operational detail (that goes in slide 5). Each `h3` has at most six words: the detail goes in the `p`. Block: `.cols-3.aligned.slots-4` with three `.card`:

| Card | `.k` | `h3` | `p` | last element |
|---|---|---|---|---|
| 1 | Goal | The project goal in one line | Since when, by when | empty `<span></span>` |
| 2 | For today | The macro activity promised for this call | The outcome in one sentence | `.pill.done` "Done", `.pill.now` "Partly" or `.pill.block` "Not done" |
| 3 | For <next meeting date> | The macro activity to close by the next meeting | What it takes to get there | `.pill` with the date |

### Slide 3. Closed activities

`.slide.page`, eyebrow "Done".

Only **closed** activities, each with its number. The title carries the most important number.

- **Up to four activities**: `.kpis` with one `.kpi` per activity. `.n` is the number, `.l` is the activity in one sentence.
- **More than four**: `.panel` with `.table`. Columns: Activity (`td.lab`), Result (`.num`), and Closed on (`.num`) only if the meeting gives the date of every activity. If it gives it only for some, no column: the date goes in the activity text. Use `.panel.grow` and the table stretches to the bottom. More than eight rows: add `.dense`.

An activity without a number goes in the table with the result in words, never with an invented number.

### Slide 4. What is blocked and what we need from you

`.slide.page`, eyebrow "Blockers".

One blocker per card: `.cols-2` or `.cols-3` with `.aligned.slots-4`.

- `.k`: who must provide it, and the date the meeting gives: by when it is needed ("Giulia, Rossi · by 15 March") or since when we have been waiting for it ("Marketing team · since 2 March"). If the meeting gives neither, just who.
- `h3`: what is missing, in plain words ("The product photos").
- `p`: what it blocks ("Without photos the catalogue pages stay empty").
- `.n` at the bottom: the number that is stuck, with its unit: `<div class="n"><div class="v">4</div><div class="u">pages on hold</div></div>`. If the meeting gives no number, use the one that matters (languages, days, products) and write it in the extract.

The title says what is needed and what it unblocks. If there are no blockers, the slide stays and uses `.statement`: "No blockers: we move ahead as planned".

### Slide 5. Next steps

`.slide.page`, eyebrow "Next steps".

A Gantt: the single activities that lead to the macro activity of slide 2, card 3, on an axis of days. The client's activities go in too: every blocker from slide 4 comes back here with owner and date.

**The axis.** It starts on the meeting day and ends at go-live, if that is within five weeks. Otherwise it ends at the next meeting plus one week. One day per column: `--days` is the number of days on the axis.

**The columns.** The meeting day is column 1, the next day is 2, and so on. A bar from day A to day B has `grid-column: A / B+1`. Example with the meeting on 12 March: an activity from 12/03 to 14/03 is `grid-column: 1 / 4`.

**The rows.** One row per activity, in order of end date. Nine rows at most. If there are more, group them:

- activities of the same owner that lead to the same delivery ("texts corrected, then published in test");
- activities in a chain between client and supplier ("Giulia books the call, then the photographer delivers"), in the same row with two bars;
- deliveries of the same kind from different people (texts from several departments), if they have the same date.

A grouped row is ordered by its first end date. Activities that do not lead to the macro activity of the next meeting (a guide to update, a notice to forward) stay out of the Gantt: you list them in the delivery.

**Start and end of every bar.**

- The end is the date given in the meeting.
- The start is the meeting day. If the activity depends on another one ("if the photos arrive, the pages are ready on the 20th"), the start is the day after the one it depends on.
- An activity without an end date: a five-day `.open` bar with the label "to be defined", and the item goes in "To verify".
- A one-day deadline (a delivery, a report): `.ms` instead of the bar.

**The labels.** The row name (`.t`) fits on a single line, about 32 characters: "Product photos, then catalogue pages", not "Product photos from the photographer, then upload into the catalogue pages". Below it (`.d`) who does it, also on one line. If it is longer, the layout check flags it.

**The colours.** `.bar.us` for our activities, `.bar.client` for those of the client and their suppliers. The title says how many belong to the client.

```html
<div class="gantt-wrap">
  <div class="gantt" style="--days:21">
    <div class="gantt-bg">
      <i class="we" style="grid-column:4 / 6"></i>        <!-- Saturday and Sunday -->
      <i class="today" style="grid-column:1 / 2"></i>     <!-- the meeting day -->
      <i class="key" style="grid-column:15 / 16"></i>     <!-- next meeting -->
      <i class="key" style="grid-column:21 / 22"></i>     <!-- go-live -->
    </div>
    <div class="g-head">
      <div class="g-lab"><div class="d">March 2026</div></div>
      <div class="g-axis">
        <span class="now"><b>T</b>12</span><span><b>F</b>13</span><span class="we"><b>S</b>14</span>
        <!-- one span per day: b = initial of the weekday, then the number.
             .we for Saturday and Sunday, .now for the meeting day, .key for meeting and go-live -->
      </div>
    </div>
    <div class="g-rows">
      <div class="g-row">
        <div class="g-lab"><div class="t">Product photos</div><div class="d">Giulia, Rossi</div></div>
        <div class="g-track"><div class="bar client" style="grid-column:1 / 3">1 Oct</div></div>
      </div>
      <div class="g-row">
        <div class="g-lab"><div class="t">Speed report</div><div class="d">Paolo</div></div>
        <div class="g-track"><div class="ms" style="grid-column:13 / span 4">12 Oct</div></div>
      </div>
    </div>
  </div>
  <div class="g-legend">
    <span><i class="us"></i>Us</span><span><i class="client"></i>Client</span>
  </div>
</div>
```

Bar labels are short: the end date ("2 Oct") or the range ("7-13 Oct"). A one-day bar has no room for a label: use `.ms`.

The title counts the **rows** of the Gantt, not the single bars: it says how many there are, until when and how many belong to the client. Example: "Seven steps to launch: four are yours".

## 5. Delivery

1. `node deck-kit/check-layout.js ~/Downloads/<folder>/index.html`, until it comes out clean.
2. Give the path of `index.html` and of `extract.md`.
3. List what is left `[TO VERIFY]` in the slides (written in the user's language, e.g. [DA VERIFICARE] for Italian).
4. Ask whether they want the PDF.
