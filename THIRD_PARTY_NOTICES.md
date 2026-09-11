# Sources and notices

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
