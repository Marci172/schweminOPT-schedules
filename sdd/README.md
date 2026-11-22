# schweminOPT Due Date Scaling set (SDD), version 2 (2026)

260 instances with due dates for measuring how solvers handle the total weighted tardiness across instance sizes,
shapes and degrees of machine flexibility: the sum over the jobs of weight x max(0, end of the job - due date). The
public weighted tardiness job shop instances are 10 x 10 (Singer and Pinedo 1998); SDD covers 2,500 to 490,000
operations, with and without machine choice.

## Instances

`BASE+ddTAU` is the base instance `BASE` with due dates of tightness TAU (50, 70, 90 or 105). The base instances are
instance 1 of every size of the two scaling sets, unchanged:

| Base set | Categories | Base instances | With four levels |
|---|---|---|---|
| Job shop scaling set SJS, version 3 (`sjs_J_M_1`, `sjsw_J_M_1`) | 27 sizes, 2 with wide processing times | 29 | 116 |
| Flexible job shop scaling set SFJS, version 3 (`sfjs_J_M_1_KIND`) | 36 sizes and kinds (`edata`, `rdata`) | 36 | 144 |

Version 2 (2026-11-22) adds the sizes with more jobs than machines: the ten of SJS version 3 (40 instances) and the
eight sizes and kinds of them that SFJS version 3 lists (32 instances). The 188 instances of version 1 are unchanged.
The reference makespans of the new base instances are from 120 second runs.

`sdd.csv` lists every instance (base, problem, kind, jobs, machines, operations, tau, reference makespan, longest
job, file).

## Due dates and weights

With p_j the work of job j (every operation at its shortest duration) and H the reference makespan of the base
instance:

    due_j = p_j + floor(tau x (H - p_j)),    tau = TAU / 100

At tau = 0 every job would have to end as if it were alone in the shop; at tau = 1 every job may take as long as a
good schedule for the makespan takes in all, and that schedule has no late job. Three levels stay below 1: there a
schedule without a late job would need a makespan below the reference makespan. The fourth lies above 1: there every due date is at or
after the reference makespan, the reference schedule has no late job and the optimum is 0; the question is whether
and how fast a solver that minimises tardiness finds a schedule without any.

| Level | tau | Meaning |
|---|---|---|
| `+dd50` | 0.5 | tight: nearly every job is late |
| `+dd70` | 0.7 | medium |
| `+dd90` | 0.9 | loose: about half to three quarters of the jobs are late in a 10 second search |
| `+dd105` | 1.05 | slack: a schedule without a late job exists (optimum 0), but only just |

Weights follow Singer and Pinedo: the first 20 % of the jobs weigh 4, the next 60 % 2, the last 20 % 1. No release
dates.

Why not their due date rule (a factor times the job's work): the factor means something else for every shape. At
100 jobs on 25 machines a good makespan is 4.5 times a job's work, at 25 jobs on 100 machines 1.1 times, so one
factor leaves every job hopelessly late in the first and none in the second.

## Reference makespans

`reference_makespans.csv` holds H per base instance, the makespan a search found, with its time limit and source:
the classical instances from `gpusched.solve` on an RX 6700 XT (seed 1; 120 s up to 200 machines, 600 s above), the
flexible ones the lowest makespan of the 10 minute runs on file. They only set the scale and are frozen with this
version: a better makespan found later does not change the set.

A makespan from a dispatch rule was tried as a scale that needs no search and dropped: it lies 14 % (25 x 100) to
50 % (50 x 50) above a good makespan, so the same tau gave no late job on one shape and nearly half late on another.

## Format

One JSON file per instance in `due/`: `instance`, `base`, `problem` (`jobshop` or `flexible_jobshop`), `objective`,
`tau`, `reference_makespan`, `due` and `weights` (one entry per job, in the order of the base file). The base
instance itself is read from its own set:

- `benchmarks/jobshop/instances/SJS2026/sjs/` and `sjsw/` (standard job shop text format),
- `benchmarks/flexible_jobshop/instances/SFJS2026/edata/` and `rdata/` (`.fjs`).

## Generation

`generate.py` writes the set from the base files and `reference_makespans.csv`; `generate.py --check` regenerates
it and compares file by file; `checksums.sha256` holds the SHA-256 of every file.
`scripts/experiments/sdd_reference.py` produced the reference makespans.

## Licence and citation

Creative Commons Attribution 4.0 (CC BY 4.0). Please cite as: schweminOPT Due Date Scaling set (SDD), version 2, 2026,
https://github.com/Marci172/schweminOPT-schedules.
