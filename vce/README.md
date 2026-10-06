# VCE 3/4 Field Guide

An interactive study guide for **VCE Units 3 & 4** in six subjects: **Mathematical Methods, Specialist Mathematics, Physics, Chemistry, Biology and English Language**. It has detailed explanations, step-by-step worked solutions, about 1,800 practice questions (basic → exam-level → trick), a cross-subject trick-question quiz, a review list, glossaries, 44 interactive simulations and a search bar across every subject.

The whole site is one self-contained file, `index.html`. It needs no server, no login and no build step to use.

## Sharing it

| Option | How |
|---|---|
| **GitHub Pages** (public link, no sign-in) | Repo **Settings → Pages → Deploy from a branch**, pick the branch and `/ (root)`. The guide is then at `https://<user>.github.io/<repo>/vce/`. |
| **Any static host** | Upload `index.html` to Netlify Drop, Cloudflare Pages or a school web server. |
| **Offline** | Send or save `index.html` and open it in any browser. Maths renders offline; web fonts fall back to system fonts. |

## What's inside

| Subject | Pages | Highlights |
|---|---|---|
| Mathematical Methods | 30 | Functions and transformations, calculus, probability and statistics; Exam 1 (tech-free) and Exam 2 (CAS) practice; transformation, tangent, Newton's method, trapezium, binomial, normal and confidence-interval simulations |
| Specialist Mathematics | 40 | Logic and proof, induction, complex numbers, rational functions, advanced calculus, differential equations, kinematics, vectors, lines and planes, linear combinations and inference; Exam 1 and Exam 2 practice sets plus six real-VCAA-question papers; Argand-diagram, rational-graph, complex-roots, slope-field/Euler and sample-mean simulations |
| Physics | 38 | Motion (incl. rollercoasters and tension), fields, generation and transmission, light and matter, relativity, practical investigation; 16 simulations |
| Chemistry | 28 | Fuels, galvanic and electrolytic cells, rates and equilibrium, organic reactions and analysis, food chemistry; galvanic cell, Maxwell–Boltzmann, equilibrium and NMR simulations |
| Biology | 24 | Nucleic acids and proteins, DNA tools, enzymes, photosynthesis and respiration, immunity, disease, evolution; translation/mutation, gel, enzyme, photosynthesis and genetic drift simulations |
| English Language | 20 | Metalanguage, informal and formal language, Australian English and its varieties, identity; Section A/B/C practice with original transcripts, a model commentary and essay plans; HCE vowel chart and feature-spotting drill |

Progress (completed topics, self-marks, quiz answers, the review queue) is stored in the browser's `localStorage` only, per device and per copy of the guide. **Move your progress** on the home page copies it to another copy as a code.

## Review queue and blurting

- **Spaced review queue.** Every question you flag ("Review later"), get wrong in multiple choice, or send from a practice exam joins a queue. Get it right and it comes back after 1 day, then 3, 7 and 14; right again after 14 days and it's mastered. Get it wrong and it starts again tomorrow. **Start review** runs the due questions one at a time, inline.
- **Mark one question at a time.** While answering a practice exam, every question has a **Mark** button (click twice to confirm). It locks that answer and reveals just that question: right or wrong plus the explanation for multiple choice, or the marking guide to tick (or Claude's marking) for a written question. The sticky bar keeps a running "Marked so far" score, a wrong multiple-choice answer joins the review queue straight away, and marked questions stay marked after a reload.
- **Practice-exam mistakes.** Wrong multiple-choice answers join the queue when you finish a paper. After marking, written parts you answered but scored under half on can be sent with one button.
- **Blurt.** On any topic or quick-notes card, with the page hidden: answer one specific recall question per key point ("Write \(E(aX + b)\) and \(\operatorname{Var}(aX + b)\)", "Which way does friction act above the design speed?"). Feeling that you know a topic isn't the same as being able to write it, so the questions ask for the actual formula, condition or reason without giving it away. Each topic's questions live on its summary points as `data-q` (the build warns if one is missing). Prefer a blank page? **Blank-page blurt instead** switches to the old "write everything" mode, and the choice is remembered. With Claude, each answer is checked against its key point as got / partly / missed (a "got" has to quote your words), plus anything you got wrong. Without Claude, you see each key point under your answer and tick the ones you nailed (blank answers can't be ticked). Gaps can be saved to My notes. Every attempt is kept (your text and each point's result). **Blurt history**, on the quick-notes bar and the review page, lists them by day, so you can open an old attempt or redo a whole day's topics in a row (or just the ones under 80%) and see how you've moved since last time.

## Summary sheet designer (Physics)

The Physics exam allows pre-written notes (one folded A3 sheet or two A4 sheets bound together by tape) alongside the VCAA formula sheet. **Physics → Sheet designer** (`src/sheet.js`) builds that sheet:

- **Add blocks from the site:** key points, formula boxes, key ideas, trick alerts, exam tips, worked examples, diagrams, tables, glossary definitions, constants, "going deeper" notes and your saved My notes, plus your own headings, text, formulas, bullet lists and column/page breaks. Pick by topic, search everything, or use **quick packs** per area of study (topic packs, key points, all formulas, formulas *not* on the VCAA sheet, all traps, all key ideas).
- **Formula-sheet aware:** formula blocks already on the 2025 VCAA formula sheet are tagged (fully or partly), and can be hidden from the picker, so the space goes on what you actually have to remember.
- **Real paper, auto-packed:** exam presets (2 × A4 both sides, 1 × A3 both sides), A4/A3 one or two sides, portrait or landscape, 1–6 columns, text size and margins. Blocks fill each column top to bottom in order. Headings never get stranded at the bottom of a column, wide formulas shrink to fit, and a meter shows how full each side is and warns when it overflows.
- **Edit anything:** tap a block to rewrite its title and text (light markdown plus LaTeX), resize diagrams, change text size, reorder (drag or arrows), duplicate or reset to the original. Undo, several named sheets, all saved in the browser.
- **Print:** prints only the sheet at exact paper size, or downloads a self-contained print-ready HTML file (the reliable route inside a claude.ai Artifact). Black-and-white mode for mono printers.

## Claude in the guide

When the guide is opened as an Artifact on claude.ai, it can call Claude through the Artifact `sample` capability:

- **Ask Claude** on any practice question, topic, quick-notes card or review-list item. It explains the theory behind the question, quizzes you on it one step at a time, or explains why your multiple-choice pick was wrong. Answers can be saved to **My notes** for that topic.
- **Mark with Claude** on practice exams. After you finish, Claude reads each written answer against the marking guide, ticks the points you earned (you can change any tick), and says what to fix. **Mark this question** (on every question, while answering) does the same for one question without finishing the paper.

## Official questions inline (private copy)

The practice papers use real VCAA questions, which aren't reproduced here: each links to the official exam PDF. In the owner's private copy of the guide (a private claude.ai Artifact), the 27 official papers sit in the artifact's own storage, and `src/papers.js` draws each question straight from its paper, cropped to that question (options, graphs and diagrams included), on the practice exams and in review cards. Claude's marking and "Ask Claude" get the same crop. `papers.json` holds only numbers: each question's crop box (from the paper's text layer, or OCR where it has none) and where each paper is stored in that private artifact. The public `index.html` never includes it and keeps linking out. Build a public Artifact with `--no-papers`.

Each call uses the viewer's own Claude usage, and the first one asks their permission. Opened anywhere else (GitHub Pages, a saved file), the Claude controls stay hidden and everything else works the same. The **Notes** pop-out on the review list works everywhere.

## Editing the content

- `src/subjects.json`: subject order.
- `src/subjects/<subject>/subject.json`: id, topic-id prefix, name, study design and course-map groups.
- `src/subjects/<subject>/topics/*.html`: one file per page, with a metadata comment at the top (`id`, `title`, `short`, `summary`, `keywords`, `dotpoints`, optional `special: overview|reference|tool`). Links like `href="#id"` are prefixed with the subject automatically. Maths uses `\( … \)` and `\[ … \]` (KaTeX, with mhchem `\ce{}`).
- `src/app.js`, `src/styles.css`, `src/body.html`, `src/hub/`: the app shell (hub, router, search, quiz, review, theme).
- `src/motion.js`: spring animations and gestures. `src/ai.js`: the Claude features (chat sheet, notes pop-out, exam marking). `src/sheet.js`: the summary sheet designer.
- `src/sims/*.js`: the simulations (shared toolkit in `00-kit.js`).

Component markup (worked examples, practice questions, MCQs, callouts, sims) is the same as in `../physics/README.md`.

```bash
cd vce
npm install        # once, fetches KaTeX
node build.mjs     # writes index.html (checks tag balance, maths delimiters and MCQ answers)
node build.mjs --artifact out.html [--artifact-url <url>] [--no-papers]   # CDN-KaTeX fragment for claude.ai Artifacts (--no-papers for a public one)
```

## Sources

Aligned to the key knowledge in the current VCAA study designs for each subject. All explanations, diagrams, worked examples, transcripts and questions are original to this guide, written in the style of VCAA exams. Nothing is copied from Edrolo, VCAA exams or other publishers, so use the guide alongside the real past exams and examiners' reports on the [VCAA website](https://www.vcaa.vic.edu.au/assessment/vce-assessment/past-examinations). Numerical answers were checked by computation. Constants follow the VCAA data books, and English Language examples are real and dated.
