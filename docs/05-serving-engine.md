# Serving engine

[Guide index](README.md)

## Prepare a coherent local vintage

The serving lifecycle is `preflight → copy/verify → tally gates → derive → census → manifest → promote → stamp`. `datarev/derive.py` composes SQL without executing it. `writer.py` executes derived writes only in owned namespaces, with each statement group in a transaction. Read-only gates measure and classify the result.

| Derived surface | Engineering purpose |
|---|---|
| `surface_edges` | Distinct `(parent_id, seller_id)` purchase pairs with earliest `created_at` as `first_at` |
| Details indexes | Efficient parent/contact and relation joins |
| `email_freq_seller` | Existing-customer email suppression from relation-to-details joins |
| `parent_spend` | Locally derived spend fallback |
| `seller_profile` | Seller summaries from normalized URL joins to the copied profiles table |
| `attr_source_s3_c07` | Flattened purchase-driver labels at score ≥ 3 and confidence ≥ 0.7 |
| `attr_universe_s3_c07` | Attribute-space denominator data for guarded walk features |

Label and summary derivation uses the same resolved profiles source copied into this vintage. It does not combine one live RDS table with an older local graph. Missing optional prerequisites skip dependent derivations with reported gates. Availability of a promoted vintage therefore does not guarantee every scoring or enrichment surface is usable.

## Gate policy

`GateResult` carries `name`, `ok`, `blocking`, and `detail`. Only a failed blocking gate aborts. The UI and operator must read both `ok` and `blocking`; a report-only failure is not a pass.

| Check | Source threshold or rule |
|---|---|
| Non-null parent share | At least 0.70 and no drop exceeding 0.05 absolute share from previous |
| ID width | Parent and seller maxima below `2**31` |
| Export schema | All nine expected details columns present |
| Source row retention | No shrink beyond 0.1% when a previous positive count exists |
| Census retention | Pair/seller shrink beyond 0.1% blocks; parent count is report-only |
| Raw-key agreement | 0.995 floor, subject to report mode |
| Parent-pair agreement | 0.95 floor, subject to report mode |
| Per-seller preservation | 0.95 retention and train-side-collapse checks, subject to report mode |
| Referential drift | Maximum 0.02 coverage-share drift; blocking when a previous figure exists |
| Profile coverage | 0.95 threshold, with report-only disclosure |
| Derived identities | Recomputed structure must agree |
| Cutoff | Must support a non-vacuous census split |
| Attribute cell | Structural identity blocks; label census is comparative/report-only |
| Spend and suppression | Comparison/band evidence; not a blanket spend ratification gate |

The bootstrap/first comparison uses report mode where no established comparison basis exists. Report mode does not disable independent hard checks such as parent-share collapse or structural identity. Census uses deterministic samples and aggregated SQL, with explicit planner settings to avoid repeated nested-loop scans on newly copied large relations.

The default census cutoff is `2025-05-12 23:59:59`, optionally overridden by validated `SERVING_CENSUS_CUTOFF`. This is a data-quality comparison boundary. **Serving scores the whole active vintage at cutoff = positive infinity**, with no research train/holdout split applied to runtime purchases.

## Purchase graph and population

`substrate.build_vintage` resolves the active stamp/manifest, loads `surface_edges`, and cross-checks its pair count against the recorded census. `build_from_pairs` factorizes sorted parent and seller IDs into a binary sparse CSR matrix `X` (parents × sellers). Duplicate/non-binary edges are refused. Seller degree is the number of parent neighbors.

In this runtime, the historically named `profiled_mask` is the graph universe of parents with a purchase edge. It does **not** mean every parent has a Gemini profile. The vintage also carries pair-to-parent positions and first-purchase times for temporal features.

For target seller `t`, existing buyers are `train = nonzero(X[:, t])`. The decision population is:

```text
E = graph-universe parents minus the target seller's existing buyers
```

The scoring gate and final cut use the same E. A positive score outside E cannot justify serving a prospect. E must contain at least two parents so percent-rank has a valid denominator.

## Warm collaborative filtering

A seller with at least one existing buyer takes the warm path. For every other seller `s`:

```text
co(s)    = number of the target's buyers who also bought at s
sim(s)   = co(s) / (degree(s) + 10)^0.75
score(p) = sum over shops s bought from by p of sim(s)^2
```

The target's own column is zeroed both when constructing similarity and on a copy of the scoring channel. Those are two separate leakage guards. The constants are the migrated reference configuration (`alpha=0.75`, `q=2`, shrinkage 10).

If all scores in E are zero, the warm result falls through to cold ATTRPOP packaging under `cold-attrpop-cf-empty`. The real existing buyers remain excluded. If the fallback also fails, the refusal explains both missing CF signal and the cold failure.

## Cold and day-zero paths

A seller with no seed buyers uses quality-gated own-content labels. `sharing_cols` selects other sellers sharing at least one attribute; the target is excluded. ATTRPOP scores a parent by the number of those sharing sellers the parent has purchased from:

```text
score(p) = sum X[p, s] over attribute-sharing sellers s
```

This is a purchase count restricted by label sharing, not a similarity-weighted CF score and not a count of shared tags. The label matrix itself uses `score * confidence` weights and row L2 normalization; cold sharing depends on overlap. No labels means a named profiling-gap refusal. All-zero ATTRPOP over E means no usable attribute-sharing signal.

Off-graph sellers take `serve_day_zero`, which looks up quality-gated labels and sharing sellers in SQL against the active vintage, then maps those sellers onto the graph axis. It uses the same cold score and final cut. Direct `serve_seller` calls refuse off-graph IDs; the orchestration layer selects the sanctioned day-zero path.

Because runtime graph axes contain observed purchase edges, normal on-graph sellers have buyers. The zero-train branch remains part of the reusable lane contract and its tests.

## Exact quota and deterministic ties

For `n_E` eligible parents, quota is `k = (n_E - 1) // 100 + 1`, the exact integer C8/top-one-percent boundary. Only positive-scored candidates can fill seats; a short pool is disclosed and never padded with zero scores. An empty cut is refused on both ordinary and guarded-set paths.

Ordering is score descending, SHA-256-derived tie key from `salt|parent_id` ascending, then parent ID as the backstop. The salt is explicit and required. This avoids Python's randomized `hash()` and makes repeat runs on the same inputs reproducible.

Rows carry parent ID, score, percent-rank, `top_1pct` tier, serve rank, and lane. Percent-rank uses the minimum rank for a score tie across E: `(min_rank - 1) / (n_E - 1)`. Serve rank is the deterministic list position, a different quantity.

## Guarded warm selection

The optional guarded lane uses the vendored selector bundle by default when available. `SERVING_SELECTOR_BUNDLE_DIR=off` disables it. The model file is read once; SHA-256 verification precedes unpickling those exact bytes. Bundle loading also validates feature schema and filename containment and reports a missing compatible scikit-learn extra. This is a trusted bundled model, not a general untrusted-model upload feature.

The selector retrieves up to `m_ceiling` positive candidates (100,000 in the shipped bundle) in CF order. It protects the top `ceil((1-beta)*k)` CF members (90% in the shipped guard), and lets the model choose only the remaining seats. Membership can change; within-set display ordering remains CF order. If positive candidates already fit the quota, the guard degenerates to the ordinary prefix. If retrieve ceiling `m < k`, it refuses the unregistered regime rather than silently changing the policy.

The 14 frozen features combine CF score/rank ratios, parent degree/recency/tenure, walk similarities and mass, and ATTRPOP level. Walk computation uses binary seller labels `L` and integer purchase matrix `X`: reach matrices represent `X L > 0` and `X L == 1`; corrected tallies subtract target-only contributions. A seller profile divides by attribute universe counts and selects its strongest positive walk attributes. Reach matrices are cached lazily per guard instance. Missing/empty required label surfaces can make the guard unavailable by named refusal; enabling it is not a promise that every vintage can support it.

Source: `substrate.py`, `scoring.py`, `tiebreak.py`, `lanes/`, `attributes/`, `guard/`, and `datarev/` in [source reference](10-source-reference.md). Contact selection and evidence follow in [the next document](06-handoff-export-and-evidence.md).
