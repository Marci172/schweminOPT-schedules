# schweminOPT Flexible Job Shop Scaling set (SFJS), version 2 (2026)

126 flexible job shop instances for measuring how solvers behave across instance sizes, shapes and degrees of machine
flexibility. The public flexible sets end at about 500 operations (Behnke and Geiger: 100 jobs x 60 machines with 5
operations per job); SFJS covers 2,500 to 490,000 operations.

## Version 2 (2026-11-12): 84 of the 126 instances

Version 1 held 42 instances that two trivial lower bounds close or nearly close, so they do not measure a solver:
the longest job (every operation at its shortest duration) and the load bound (all work divided by the number of
machines). With many machines per operation there is no competition left for machines and the optimum is one of the
two; OptalCP proves 28 of them optimal within 60 seconds.

Version 2 is the list `sfjs_v2.csv` (instance, size, options, the two bounds, file): the files are those of version
1, unchanged. Removed:

| Removed | Instances | Why |
|---|---|---|
| all `vdata` | 24 | squares and 25 x 100: optimum = longest job; 100 x 25, 140 x 35: within 0.1 % of the load bound |
| 25 x 100 and 35 x 140, `edata` and `rdata` | 12 | far more machines than jobs: within 0 - 2.4 % of the longest job |
| 100 x 25 and 140 x 35, `rdata` | 6 | within 0 - 0.7 % of the load bound |

What remains: the ten squares and the three machine-axis sizes with `edata` and `rdata`, and 100 x 25 and 140 x 35
with `edata`. There the best values known on 2026-11-12 are 0.5 % to 60 % above the trivial bounds (the gap grows
with the size and is larger for `edata`).

The rest of this file describes version 1, which the files and `generate.py` still produce in full.

## Instances

`sfjs_J_M_k_KIND` is the instance `sjs_J_M_k` of the schweminOPT Job Shop Scaling set (SJS, version 1: J jobs, M
machines, every job visits every machine once, processing times uniform in 1..99) with machine options of KIND. The
first three instances (k = 1..3) of every SJS size are used.

| Kind | Machines per operation | Sizes |
|---|---|---|
| `edata` | 1.15 on average, at most 3 | all 17 sizes |
| `rdata` | 2 on average, at most 3 | all 17 sizes |
| `vdata` | M / 2 on average, at most 4 M / 5 | the 8 sizes with at most 100 machines |

Sizes (J x M): squares 50, 60, 70, 80, 90, 150, 200, 300, 500, 700; shapes 25 x 100, 100 x 25, 35 x 140, 140 x 35;
machine axis 200 x 300, 200 x 500, 200 x 700.

The kinds follow Hurink, Jurisch and Thole's edata / rdata / vdata sets (1994), which were derived from classical job
shop instances the same way. As there, an operation takes the same time on each of its machines, and the machine of
the classical instance is always among them (it is the first option), so the classical instance's optimum is an upper
bound of every kind's.

## Format

The usual `.fjs` text format (Brandimarte's): the first line holds the number of jobs, the number of machines and the
average number of machines per operation; then one line per job: its number of operations and, per operation, the
number of options followed by that many pairs of machine (numbered from 1) and processing time. Instances with
50,000 operations or more are gzip-compressed (`.fjs.gz`).

## Generation

The base instance is regenerated from its two Taillard seeds (SJS's `sjs_seeds.csv`). Per operation the number of
machines is 1 + a binomial draw with the kind's mean and maximum, the further machines are drawn uniformly without
repetition (`gpusched.models.flexible_jobshop.machine_options`, numpy's default generator seeded with the option
seed + 15485863). The option seeds are in `sfjs_seeds.csv`; they were drawn from the master seed 20261111.

The files are the definition of the set: `generate.py --check` regenerates and compares them, `checksums.sha256`
holds the SHA-256 of every file.

## Licence and citation

Creative Commons Attribution 4.0 (CC BY 4.0). Please cite as: schweminOPT Flexible Job Shop Scaling set (SFJS),
version 1, 2026, https://github.com/Marci172/schweminOPT-schedules.
