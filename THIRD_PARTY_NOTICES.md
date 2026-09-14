# Sources and notices

## Chapter epigraphs — 2026-09-14

Each of the five lessons now has a short sourced quotation, a separately identified Thai translation written for QuantCorner, and a direct source link. The quotations are from Louis Bachelier's *Théorie de la spéculation* (1900), Richard Feynman's blackboard as documented by Caltech, Pierre-Simon Laplace's *A Philosophical Essay on Probabilities* (Truscott/Emory translation, 1902), Henri Poincaré's *The Value of Science* in *The Foundations of Science* (Halsted translation), and George E. P. Box's *Robustness in the Strategy of Scientific Model Building* (1979, DTIC archive). Explicit ellipses mark the Bachelier and Laplace excerpts. Box's source heading retains its uppercase wording.

Only short quotations and new Thai translations are included; no source image, full document or new graphic asset is redistributed. The notebook versions reproduce the same epigraphs. Source locations, contextual relevance, and verification notes are recorded in `data/chapter-quotes-provenance.json`. The Feynman and Poincaré quotations express general approaches to understanding mathematics; their placement does not imply that either speaker made those remarks about these finance models. The owner's existing separate Thai opening remark in the first lesson is preserved without adding an unverified author.

## QuantCorner / Quantsera book cover — 2026-09-13

The cover uses the owner's approved `quantcorner-horizontal-transparent-offwhite-1024.png` and `quantsera-horizontal-transparent-offwhite-1024.png`, copied unchanged from the canonical brand packages. Native HTML/CSS places the separate logos on a black background under `quantseras-design-system.md` and the `no-image-generator` route. Source hashes and roles are recorded in `data/brand-cover-provenance.json`. The Quantsera immutable-logo preflight passed for the canonical package and the copied asset. The earlier stochastic-path artwork remains an unused asset.

## Black-Scholes Model chapter — 2026-09-14

The owner supplied *The Black–Scholes Model*, a 108-page scanned lecture with the footer Certificate in Quantitative Finance, in `Black-Scholes Model.pdf`. No individual author or publication date has been verified from the visible lecture. PDF metadata is not treated as an authorship or publication claim. The PDF was consulted locally; neither the source file, slide images nor source logos are redistributed.

The chapter explains the lecture's mathematical ideas in newly written Thai prose. It connects the existing Binomial, transition-density and Itô chapters with self-financing replication, the PDE, European vanilla and digital valuation, Greeks and early exercise. The private-course page map is kept in `data/black-scholes-provenance.json`, not as a reader-facing bibliography bullet. Worked prices, native charts, numerical tests and Python examples are independently computed hypothetical examples. Self-financing funding, the distinction between physical and pricing measures, Greek units, and the conditions for early exercise are made explicit.

Supplementary primary reading: Martin Haugh, [The Black-Scholes Model](https://www.columbia.edu/~mh2078/FoundationsFE/BlackScholes.pdf), Columbia University (2016), and MIT OpenCourseWare, [Black–Scholes Formula & Risk-neutral Valuation](https://ocw.mit.edu/courses/18-s096-topics-in-mathematics-with-applications-in-finance-fall-2013/d19208c017ada04f9261cfb41ab8d702_MIT18_S096F13_lecnote19.pdf), 18.S096 (Fall 2013). No source prose or figure is reproduced verbatim. The JavaScript normal CDF reuses the existing independently implemented NIST-identity-based erfc routine; the Notebook uses Python's standard-library `math.erf`.

All new visuals follow the `no-image-generator` route using the existing book's React/SVG components and a reproducible native SVG Notebook plot. No new third-party artwork, icon, font or modified brand asset is introduced.

## Applied Stochastic Calculus chapter — 2026-09-12

The user supplied `JA251.4 Notes.pdf` (43 pages), titled *CQF Module 1 Lecture 4 — Introduction to Stochastic Calculus*, and `JA251.5 Notes.pdf` (44 pages), titled *CQF Module 1 Lecture 5 — Stochastic Differential Equations – Maths and Computation*. The supplied documents identify CQF and show Fitch Group branding; no individual author is credited in the inspected material. PDF creation or modification metadata is not treated as a publication date. Both PDFs were consulted locally; neither the PDFs, their slide images, nor their logos are redistributed.

The new Thai chapter synthesizes the two lectures into a continuous explanation, with newly computed native charts and reproducible examples. The source's two-step Euler example is retained with its inputs identified and its unrounded second value 99.93864. Quadratic-variation shorthand, regularity and nonanticipation assumptions, OU conditional moments, Euler positivity failures, and Gaussian covariance conditions are clarified. Private inputs and review renders remain outside the repository. Source page ranges, seeds, assumptions and verification commands are recorded in `data/stochastic-calculus-provenance.json`.

Supplementary mathematical references are Miranda Holmes-Cerfon's *Applied Stochastic Analysis* (Spring 2022), [Lecture 7: Stochastic Integration](https://personal.math.ubc.ca/~holmescerfon/teaching/asa22/handout-Lecture7_2022.pdf), [Lecture 8: Stochastic Differential Equations](https://personal.math.ubc.ca/~holmescerfon/teaching/asa22/handout-Lecture8_2022.pdf), and [Lecture 10: Forward and Backward Equations](https://personal.math.ubc.ca/~holmescerfon/teaching/asa22/handout-Lecture10_2022.pdf). The existing local React components, fonts and governed book design are reused. All new visuals use the `no-image-generator` route; no new third-party icon, artwork, or copied chart is introduced.

## Transition Density Functions chapter — 2026-09-12

The user-supplied `JU241.3 Notes.pdf` is a 49-page lecture titled *Transition Density Functions*. No author or institution is identified on the inspected title page; attribution from the preceding Binomial lecture is not inherited. The source was consulted locally, and neither its PDF nor slide images are redistributed. The Thai prose is newly written around the source's symmetric trinomial walk, forward/backward equations, similarity reduction and Gaussian kernel. Discrete probability mass is distinguished from continuous density; Markov conditioning and the distributional Dirac initial condition are added clarifications.

New hypothetical calculations, native charts, exact trinomial recurrence and executable Python examples are documented in `data/transition-density-provenance.json`. The diagrams are editable in `assets/diagrams/kolmogorov-directions.excalidraw`, with SVG exported from that scene by Excalidraw 0.18.1. All new chapter visuals use the `no-image-generator` route and the existing QuantCorner light book design. No source image, logo or new third-party icon was introduced.

Supplementary mathematical references are Miranda Holmes-Cerfon, *Applied Stochastic Analysis, Lecture 6: Brownian motion* (Spring 2022), https://personal.math.ubc.ca/~holmescerfon/teaching/asa22/handout-Lecture6_2022.pdf; and Gilbert Strang, *The Heat Equation and Convection-Diffusion*, https://math.mit.edu/classes/18.086/2006/am54.pdf. The JavaScript complementary error function is independently implemented from NIST DLMF mathematical identities 7.6.2 (https://dlmf.nist.gov/7.6.E2) and 7.9.2 (https://dlmf.nist.gov/7.9.E2), not copied third-party software. Its numerical checks include independent reference values, quadrature, and comparison with Python's standard-library error function.

## Binomial Model chapter — 2026-09-12

The user-supplied `JU241.2 Notes (1).pdf` is an 89-page lecture titled *Binomial Model* with the footer Certificate in Quantitative Finance. No individual author is identified on the inspected title page. The file was consulted locally as reference material; neither the PDF nor its slide images are republished. The Thai chapter explains the mathematical ideas in newly written prose, maps the source's v/p′ notation to d/q, and states assumptions and approximation limits. Source page ranges are recorded in `data/binomial-provenance.json`; supplementary university references remain at the end of `binomial-model.md`.

The two-step 100 → 110/90 → 121/99/81 example, European Call/Put lab, exercises and Python code are newly authored hypothetical examples. The diagram `assets/diagrams/binomial-two-step.excalidraw` is the editable source; its SVG was exported from that scene using Excalidraw 0.18.1 and retains native labels. The diagram, tables, equations and interface use the `no-image-generator` route with the existing QuantCorner light book design. No additional third-party icon, logo, source image or generated artwork was introduced.

## One-day hedging walkthrough

The displayed hedge lesson now uses 100 → 101/99 over one day, K=100, physical probabilities 0.6/0.4, and initially zero interest. Five newly authored editable Excalidraw scenes and SVG previews (`assets/diagrams/hedge-day-1` through `hedge-day-5`) progressively reveal payoff, long-call/short-half-share hedge, its fixed terminal liability, price, and risk-neutral weights. The user supplied CQF lecture screenshots (shown as JA251.2 Notes.pdf) as a teaching-sequence reference. No screenshot, logo or verbatim lecture prose is republished. Calculations and both arbitrage directions are verified in the executable Notebook. The former 50/150 one-year tree is retained as an unused asset; that price example remains only for Jensen's inequality.

## Technical-analysis satire

The displayed light-theme revision is `assets/images/technical-lightning-satire-light.png`, edited with the built-in Image Generator. Brief: wide 16:9 editorial illustration, off-white background, pale lavender clouds, purple lightning, teal trend lines and small coral arrows; no embedded text. The humorous Thai caption is editable Markdown. The original dark version below is retained as an unused earlier asset.

`assets/images/technical-lightning-satire.png` is an original image made with the built-in Image Generator on 2026-09-11. Route: image-generator-only for the requested satirical illustration; native HTML integration. Brief: a fictional Thai town under violet lightning, teal parallel channel annotations and coral arrows, with the exact captions “เมื่อเห็นกราฟในทุกอย่าง” and “แนวรับแข็งมาก… เสาไฟยังอยู่”. The user supplied a lightning meme as a conceptual reference; its photograph was not copied. This is humor about pattern finding, not financial data or a documentary weather photograph.

## Educational references

- Louis Bachelier, *Théorie de la spéculation* (1900), Annales scientifiques de l'École Normale Supérieure, 3e série, 17, pp. 21–86, https://www.numdam.org/item/ASENS_1900_3_17__21_0/. The revised opening paraphrases the introductory idea of studying the probability of price changes rather than exact future prices. It identifies this work as one of the foundations of quantitative finance, without attributing the later GBM model to Bachelier.
- Options Industry Council, *Options Basics*, https://www.optionseducation.org/optionsoverview/options-basics. Reference for option rights, strike, expiration and premium. The introductory 120-baht strike / 8-baht premium example is newly constructed for this lesson.
- Paul Wilmott, *Paul Wilmott on Quantitative Finance*, second edition, John Wiley & Sons, 2006. Chapter 3, “The Random Behavior of Assets,” printed pp. 55–70. User-supplied PDF, consulted locally. The revised Thai manuscript translates and adapts the chapter's sequence, explanations, examples, numbers, and equations. It is not an authorized publisher edition. The PDF pages and original chart images are not bundled.
- Figure 3.3, p. 60: 34 visible Perez Companc prices and the printed return column transcribed into `data/`. Reconstructed returns use the rounded prices. They are distinguished from the printed returns and from statistics reported for the full original series.
- S&P Dow Jones Indices / Morningstar, SPIVA Asia Ex-Japan Year-End 2025, Report 1a, p. 9, https://www.spglobal.com/spdji/en/documents/spiva/spiva-asia-ex-japan-year-end-2025.pdf. Thailand Large-Cap underperformance percentages versus S&P Thailand BMI for periods ending December 31, 2025 are stored in `data/thai-funds-spiva-2025.json`. Native stacked bars derive the complementary share as 100 minus underperformance. This replaces the historical UK fund example; no report chart image is reproduced.
- Dialid Santiago, *Understanding Quantitative Finance*, https://quantgirluk.github.io/Understanding-Quantitative-Finance/intro.html. Reference for the explanatory notebook/book format. No website prose, code, or chart images copied.

## Interface dependencies

React Bits CountUp, AnimatedList and Stepper are adapted from DavidHDev/react-bits, commit `8d1c5fa9ebee6e077e70c9e5c63b44e87dbeaecc`. The three source registry snapshots are preserved in `vendor/`. License: MIT plus Commons Clause, retained in `vendor/react-bits-LICENSE.txt`.

Adaptations: semantic Material 2 colors, Thai copy, static reduced-motion behavior, accessible final numeric values, native buttons and list semantics, removal of global keyboard interception, and content-height-safe step transitions.

React, React DOM, and Motion are bundled for local use. Notices are in `app.js.LEGAL.txt` and package license files under `vendor/`.

KaTeX 0.16.22 renders native HTML and MathML equations. Its distribution, including equation fonts, is packaged in `assets/katex/`; MIT license retained in `vendor/katex-LICENSE.txt`. No external runtime, analytics, or font requests are required.

## Fonts and graphics

Roboto, Roboto Mono, and Noto Sans Thai are packaged Fontsource-based assets. Licenses are included in `assets/fonts/`. Newly drawn SVGs use explicitly sourced table data, historical percentages, or model calculations labeled as simulations. No source chart image or custom brand mark is used. The separately requested cover artwork is described below.

Design authority: QuantCorner / QuantSeras Material 2. Thai content and the light default are explicit user requests. A darker teal comparison stroke supports contrast on white surfaces; the core secondary token remains `#03DAC6`. Source text and mathematics are selectable.


## Welcome cover and book navigation — 2026-09-11

`assets/images/welcome-paths.png` is an original conceptual cover artwork created with the built-in Image Generator, inspired by the stochastic-path image supplied by the user. Prompt and provenance are retained alongside it. It is not a data visualization used as evidence. Mathematical charts within the lesson remain native and calculated from source data or model formulas.

The editable `intro.md`, `_config.yml`, `_toc.yml` and Notebook organization is informed by the inspected QuantGirl UQF repository. The local builder is custom Node.js code; it is not the Jupyter Book runtime. No QuantGirl website prose or code is reproduced.

The search icon is Tabler Icons `search`, native 24px outline and 2px stroke, from commit `6d128ed935d4546607b1e4d5d08c8b27bdbe7758`. MIT license is retained in `vendor/tabler-LICENSE.txt`; the source SVG is in `assets/icons/search.svg`. Adaptation is limited to currentColor, display sizing and decorative accessibility attributes.

## One-step Call tree
The editable Excalidraw scene and matching native SVG in `assets/diagrams/` are newly drawn. The user-provided tree image informed the branching layout only; no source image or logo is reused. The lesson now uses physical up/down probabilities 0.6/0.4 and derives risk-neutral weights 0.5/0.5 with zero interest. The replication argument is checked against Clare Wallace, Durham University, The one-period binomial model, https://maths.dur.ac.uk/users/clare.wallace/MF/Chapter2.html.
