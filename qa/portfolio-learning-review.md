# Portfolio learning revision — 2026-09-18

Scope: Optimization Problem (existing portfolio-optimization URL), Black–Litterman, and the MPT-in-practice section of Portfolio Theory.

## Round 1 — editorial and source review

- Applied the requested no-ai-slop editing guidance to both chapter introductions and targeted explanatory prose. Retained mathematical derivations, meaningful distinctions, existing quotations, and unrelated authored text.
- Moved the four-asset covariance setup after regression and Lagrange, immediately before its application.
- Removed build-tool/process details from reader prose; retained traceability in provenance and EDITING.
- Cross-checked the historical 30/36 survey statistic against the publisher's excerpt of Quantitative Equity Investing, page 23. Distinguished the 2006 survey from its 2007 article and current industry usage.
- Correctly qualified mean-estimation SE, changing covariance, nonlinear instruments, scenario tails, and numerical versus analytical stochastic control.
- Checked all eight content chapters still contain their quotations.
- Added public-domain Lagrange and Fischer Black portraits with source notices and notebook attachments. Linked Litterman's interview without reproducing an image whose open reuse rights were not established.

## Round 2 — calculations and behavior

- npm test passed, including new long-only budget/return/variance bounds, endpoint and infeasibility cases, quadratic stationarity/complementarity, parameter counts, mean SE, no-view BL recovery, risk-aversion scaling, negative views and view subsets.
- Executed all notebook code cells: Optimization Problem 9, Black–Litterman 4, Portfolio Theory 9. Verified source hashes and image attachments.
- Browser interactions passed for constraint modes, target feasibility, BL view toggles and negative returns, independent controls, estimation presets and resets.
- Fixed the new title's duplicate anchor; preserved historical page URLs and links.

## Round 3 — rendered and regression review

- build:pages passed: 10 pages, 198 exported files, 717 local references.
- portfolio-optimization-page-checks passed offline title/sidebar/math/image/notebook checks, glossary/search links, keyboard answers, and desktop/mobile light/dark checks.
- portfolio-optimization-browser passed existing BL numerical, keyboard and responsive checks.
- portfolio-learning-browser passed 24 viewport/theme states across three pages (320, 390, 768, 1440 px), with no page errors, overflow or serious/critical WCAG findings.
- portfolio-browser passed regression checks for the existing Portfolio Theory experiment.
- Visually inspected new geometry, frontier/weights, BL controls/chart and estimation chart in desktop/mobile and light/dark screenshots.
- Fixed displayed negative zero in constraint slack; made the BL return axis responsive and capable of showing negative values; labeled the frontier's inefficient branch.
- git diff --check passed.

These checks validate the educational examples and browser behavior. The examples use hypothetical inputs, not fitted market data. Publication status is reported separately after the deployment workflow and live checks.

## Black–Litterman Part III extension — 2026-09-19

- Renamed the chapter to Black–Litterman Portfolio while retaining URLs and anchors; updated Welcome, sidebar, glossary overview and the preceding chapter's link.
- Read source PDF pages 101–131 and visually checked the Bayes and posterior formulas on pages 106, 124 and 126. Mapped coverage and corrections in the chapter provenance; no private PDF/pages were published.
- Added motivation, Bayes with a worked event example, market-prior choice, dimensions and four Omega methods, posterior covariance, GLS equivalence and allocation at lambda 0.1, 1, 2.24 and 6.
- Corrected likelihood terminology, qualified GMV/mean estimation, monthly/annual tau interpretation, and the conditions behind the Kelly comparison.
- Executed all 8 Black–Litterman notebook code cells. Verified Bayesian update and GLS means agree, covariance-update and inverse-precision forms agree, and allocation first-order/budget identities hold.
- npm test, build:pages (718 local references), offline page checks and the existing BL interaction/browser suite passed. Final all-equation rendering and new anchors checked after the last prose edits.
- Visually inspected desktop intro and mobile intro, posterior formulas and allocation table. Wide equations and tables retain the existing horizontal-scroll treatment.
