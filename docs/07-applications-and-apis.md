# Browser applications and APIs

[Guide index](README.md)

## Shared approach

Each engine serves its own static browser application and API from one FastAPI process. Both use vanilla JavaScript modules, hash routing, reusable page components, and package-owned static assets. They do not require a separate Node application server. Uvicorn is launched explicitly through the engine CLI. Default addresses are profiling `127.0.0.1:8010` and serving `127.0.0.1:8020`, subject to engine configuration.

The runtime applications are different artifacts from the root guided-tour `index.html` copied into this site repository. Changing the public tour does not change either engine application.

These are local operator applications. Serving explicitly has no authentication; localhost binding is part of its operating envelope. Workspace names organize output and are not an authorization/tenant-isolation mechanism. Do not infer production multiuser security from the workspace switcher or separate engine roles.

## Profiling application

The page modules implement dashboard, new job, job detail, results, registry, tables, and settings. The shared header supplies workspace selection and persistent handoff controls. Results/registry/table routes optionally select a lens. Hash query parameters carry `selection` and optionally `user`; a person can browse another workspace without changing the configured writer identity.

`workspace-state.js` shares the selected workspace across pages. `app.js` mounts/unmounts dynamically imported pages; `api.js` owns fetch calls. Components supply tables, pagination, profile/progress bars, dialogs, and lens controls. Job submission offers an SSE stream alongside ordinary submission/status endpoints. The server emits structured events/log information; this is a response stream, not a distributed message broker.

API request models validate known lens names, remove duplicate lens selections, bound request rates, and validate workspace identifiers. Sort names map to fixed SQL expressions; request text is not pasted into ORDER BY. The store is created lazily so health/status can report degraded availability. A job before bootstrap receives a named 409 instead of an underlying missing-table error.

Usable outputs trigger handoff controls. The outstanding handoffs endpoint also exposes persisted entries whose original in-memory jobs are gone. Settings updates validate only the supported keys and save overrides under engine state.

## Serving Studio

Page modules cover the Yard/home overview, salt keys, new run, runs list, run detail, outputs, data lifecycle, and audience view. Components render the stage timeline, log console, seller-result rows, salt choice, and explanation graph. The browser uses typed export/transfer events and persisted run state; it does not shell out directly.

The run manager has one single-flight slot shared by serving runs and data operations. A concurrent run/refresh/rollback request returns 409. Runs require a registered positive salt. Registration checks uniqueness against both the salt ledger and run history, with rechecking under lock; CLI salts are explicit but the studio adds the registration workflow.

Runs and operations persist under separate directories. A nonterminal record encountered at startup is marked failed because its old worker is gone. Workers are daemon threads. Cancellation is cooperative; deleting a completed run is distinct from cancelling work. Operator actions append names/IDs to an audit JSONL log.

The Data page can initiate refresh or rollback and observe/cancel operations. Bootstrap and preflight remain CLI-only. The browser refresh uses the same read-only RDS transfer path as the CLI; the studio therefore can initiate external source access through an explicit action even though ordinary audience reads are local.

Seller lookup resolves typed IDs, rather than implementing global seller search. Shop identity uses a website domain as the primary label, business name when available as secondary information. Identity, summary, and attributes are independent reads so one missing enrichment does not erase the others.

Audience pages require the run's own persisted snapshot. CSV browsing validates a strict filename pattern, path containment, and run ownership/status; it does not expose arbitrary filesystem paths. Graph status is a read-only probe, not a graph rebuild.

## API conventions

The route tables below are extracted statically from the inspected source's decorators, with the profiling router's `/api` prefix applied. They list application endpoints, not framework-generated OpenAPI/docs endpoints or the `/static` mount. Parameter types and full request/response models remain in the linked Python functions.

Normal validation errors use 422; unknown records use 404; active-operation and invalid-state conflicts use 409. Submission endpoints generally return 202. Health/status distinguish configuration readiness and local availability rather than proving a usable source revision or successful model access. Missing configuration is reported by variable name, without returning secret values.

## Profiling routes

| Method | Path | Handler |
|---|---|---|
| GET | `/api/health` | [health](https://github.com/PayMeService/promoter-brain-core/blob/3c8eb0841795b3f0f17fde5aad67a37f73726224/engines/profiling/src/promoter_brain_profiling/api.py#L541) |
| GET | `/api/status` | [status](https://github.com/PayMeService/promoter-brain-core/blob/3c8eb0841795b3f0f17fde5aad67a37f73726224/engines/profiling/src/promoter_brain_profiling/api.py#L545) |
| GET | `/api/lenses` | [lenses](https://github.com/PayMeService/promoter-brain-core/blob/3c8eb0841795b3f0f17fde5aad67a37f73726224/engines/profiling/src/promoter_brain_profiling/api.py#L579) |
| GET | `/api/workspaces` | [workspaces](https://github.com/PayMeService/promoter-brain-core/blob/3c8eb0841795b3f0f17fde5aad67a37f73726224/engines/profiling/src/promoter_brain_profiling/api.py#L599) |
| POST | `/api/jobs` | [submit_job](https://github.com/PayMeService/promoter-brain-core/blob/3c8eb0841795b3f0f17fde5aad67a37f73726224/engines/profiling/src/promoter_brain_profiling/api.py#L621) |
| POST | `/api/jobs/stream` | [submit_job_stream](https://github.com/PayMeService/promoter-brain-core/blob/3c8eb0841795b3f0f17fde5aad67a37f73726224/engines/profiling/src/promoter_brain_profiling/api.py#L640) |
| GET | `/api/jobs` | [list_jobs](https://github.com/PayMeService/promoter-brain-core/blob/3c8eb0841795b3f0f17fde5aad67a37f73726224/engines/profiling/src/promoter_brain_profiling/api.py#L648) |
| GET | `/api/jobs/{job_id}` | [get_job](https://github.com/PayMeService/promoter-brain-core/blob/3c8eb0841795b3f0f17fde5aad67a37f73726224/engines/profiling/src/promoter_brain_profiling/api.py#L671) |
| POST | `/api/jobs/{job_id}/cancel` | [cancel_job](https://github.com/PayMeService/promoter-brain-core/blob/3c8eb0841795b3f0f17fde5aad67a37f73726224/engines/profiling/src/promoter_brain_profiling/api.py#L675) |
| DELETE | `/api/jobs/{job_id}` | [delete_job](https://github.com/PayMeService/promoter-brain-core/blob/3c8eb0841795b3f0f17fde5aad67a37f73726224/engines/profiling/src/promoter_brain_profiling/api.py#L686) |
| GET | `/api/jobs/{job_id}/handoff` | [get_handoff](https://github.com/PayMeService/promoter-brain-core/blob/3c8eb0841795b3f0f17fde5aad67a37f73726224/engines/profiling/src/promoter_brain_profiling/api.py#L697) |
| POST | `/api/jobs/{job_id}/handoff` | [request_handoff](https://github.com/PayMeService/promoter-brain-core/blob/3c8eb0841795b3f0f17fde5aad67a37f73726224/engines/profiling/src/promoter_brain_profiling/api.py#L710) |
| GET | `/api/handoffs` | [list_handoffs](https://github.com/PayMeService/promoter-brain-core/blob/3c8eb0841795b3f0f17fde5aad67a37f73726224/engines/profiling/src/promoter_brain_profiling/api.py#L728) |
| DELETE | `/api/handoffs/{job_id}` | [dismiss_handoff](https://github.com/PayMeService/promoter-brain-core/blob/3c8eb0841795b3f0f17fde5aad67a37f73726224/engines/profiling/src/promoter_brain_profiling/api.py#L756) |
| GET | `/api/config` | [get_config](https://github.com/PayMeService/promoter-brain-core/blob/3c8eb0841795b3f0f17fde5aad67a37f73726224/engines/profiling/src/promoter_brain_profiling/api.py#L779) |
| GET | `/api/config/defaults` | [get_config_defaults](https://github.com/PayMeService/promoter-brain-core/blob/3c8eb0841795b3f0f17fde5aad67a37f73726224/engines/profiling/src/promoter_brain_profiling/api.py#L783) |
| PUT | `/api/config` | [update_config](https://github.com/PayMeService/promoter-brain-core/blob/3c8eb0841795b3f0f17fde5aad67a37f73726224/engines/profiling/src/promoter_brain_profiling/api.py#L787) |
| GET | `/api/tables/{lens_name}/{table_type}` | [get_raw_table](https://github.com/PayMeService/promoter-brain-core/blob/3c8eb0841795b3f0f17fde5aad67a37f73726224/engines/profiling/src/promoter_brain_profiling/api.py#L802) |
| GET | `/api/results/{lens_name}/stats` | [result_stats](https://github.com/PayMeService/promoter-brain-core/blob/3c8eb0841795b3f0f17fde5aad67a37f73726224/engines/profiling/src/promoter_brain_profiling/api.py#L860) |
| GET | `/api/results/{lens_name}/{result_id}` | [get_result](https://github.com/PayMeService/promoter-brain-core/blob/3c8eb0841795b3f0f17fde5aad67a37f73726224/engines/profiling/src/promoter_brain_profiling/api.py#L883) |
| GET | `/api/results/{lens_name}` | [list_results](https://github.com/PayMeService/promoter-brain-core/blob/3c8eb0841795b3f0f17fde5aad67a37f73726224/engines/profiling/src/promoter_brain_profiling/api.py#L911) |
| GET | `/api/registry/{lens_name}` | [get_registry](https://github.com/PayMeService/promoter-brain-core/blob/3c8eb0841795b3f0f17fde5aad67a37f73726224/engines/profiling/src/promoter_brain_profiling/api.py#L951) |
| GET | `/` | [index](https://github.com/PayMeService/promoter-brain-core/blob/3c8eb0841795b3f0f17fde5aad67a37f73726224/engines/profiling/src/promoter_brain_profiling/api.py#L1050) |

## Serving routes

| Method | Path | Handler |
|---|---|---|
| GET | `/api/health` | [health](https://github.com/PayMeService/promoter-brain-core/blob/3c8eb0841795b3f0f17fde5aad67a37f73726224/engines/serving/src/promoter_brain_serving/studio/app.py#L160) |
| GET | `/api/status` | [status](https://github.com/PayMeService/promoter-brain-core/blob/3c8eb0841795b3f0f17fde5aad67a37f73726224/engines/serving/src/promoter_brain_serving/studio/app.py#L170) |
| GET | `/api/data/status` | [data_status](https://github.com/PayMeService/promoter-brain-core/blob/3c8eb0841795b3f0f17fde5aad67a37f73726224/engines/serving/src/promoter_brain_serving/studio/app.py#L194) |
| POST | `/api/data/refresh` | [data_refresh](https://github.com/PayMeService/promoter-brain-core/blob/3c8eb0841795b3f0f17fde5aad67a37f73726224/engines/serving/src/promoter_brain_serving/studio/app.py#L198) |
| POST | `/api/data/rollback` | [data_rollback](https://github.com/PayMeService/promoter-brain-core/blob/3c8eb0841795b3f0f17fde5aad67a37f73726224/engines/serving/src/promoter_brain_serving/studio/app.py#L203) |
| GET | `/api/data/operations` | [list_operations](https://github.com/PayMeService/promoter-brain-core/blob/3c8eb0841795b3f0f17fde5aad67a37f73726224/engines/serving/src/promoter_brain_serving/studio/app.py#L208) |
| GET | `/api/data/operations/{op_id}` | [get_operation](https://github.com/PayMeService/promoter-brain-core/blob/3c8eb0841795b3f0f17fde5aad67a37f73726224/engines/serving/src/promoter_brain_serving/studio/app.py#L212) |
| POST | `/api/data/operations/{op_id}/cancel` | [cancel_operation](https://github.com/PayMeService/promoter-brain-core/blob/3c8eb0841795b3f0f17fde5aad67a37f73726224/engines/serving/src/promoter_brain_serving/studio/app.py#L219) |
| POST | `/api/runs` | [create_run](https://github.com/PayMeService/promoter-brain-core/blob/3c8eb0841795b3f0f17fde5aad67a37f73726224/engines/serving/src/promoter_brain_serving/studio/app.py#L225) |
| GET | `/api/runs` | [list_runs](https://github.com/PayMeService/promoter-brain-core/blob/3c8eb0841795b3f0f17fde5aad67a37f73726224/engines/serving/src/promoter_brain_serving/studio/app.py#L232) |
| GET | `/api/runs/{run_id}` | [get_run](https://github.com/PayMeService/promoter-brain-core/blob/3c8eb0841795b3f0f17fde5aad67a37f73726224/engines/serving/src/promoter_brain_serving/studio/app.py#L236) |
| GET | `/api/runs/{run_id}/log` | [run_log](https://github.com/PayMeService/promoter-brain-core/blob/3c8eb0841795b3f0f17fde5aad67a37f73726224/engines/serving/src/promoter_brain_serving/studio/app.py#L240) |
| POST | `/api/runs/{run_id}/cancel` | [cancel_run](https://github.com/PayMeService/promoter-brain-core/blob/3c8eb0841795b3f0f17fde5aad67a37f73726224/engines/serving/src/promoter_brain_serving/studio/app.py#L244) |
| DELETE | `/api/runs/{run_id}` | [delete_run](https://github.com/PayMeService/promoter-brain-core/blob/3c8eb0841795b3f0f17fde5aad67a37f73726224/engines/serving/src/promoter_brain_serving/studio/app.py#L248) |
| GET | `/api/runs/{run_id}/audience/{seller_id}` | [audience_snapshot](https://github.com/PayMeService/promoter-brain-core/blob/3c8eb0841795b3f0f17fde5aad67a37f73726224/engines/serving/src/promoter_brain_serving/studio/app.py#L254) |
| GET | `/api/runs/{run_id}/download` | [download_csv](https://github.com/PayMeService/promoter-brain-core/blob/3c8eb0841795b3f0f17fde5aad67a37f73726224/engines/serving/src/promoter_brain_serving/studio/app.py#L267) |
| GET | `/api/outputs` | [outputs](https://github.com/PayMeService/promoter-brain-core/blob/3c8eb0841795b3f0f17fde5aad67a37f73726224/engines/serving/src/promoter_brain_serving/studio/app.py#L278) |
| GET | `/api/outputs/csv/{name}` | [output_csv](https://github.com/PayMeService/promoter-brain-core/blob/3c8eb0841795b3f0f17fde5aad67a37f73726224/engines/serving/src/promoter_brain_serving/studio/app.py#L283) |
| GET | `/api/graph/status` | [graph_status](https://github.com/PayMeService/promoter-brain-core/blob/3c8eb0841795b3f0f17fde5aad67a37f73726224/engines/serving/src/promoter_brain_serving/studio/app.py#L297) |
| GET | `/api/sellers/lookup` | [lookup](https://github.com/PayMeService/promoter-brain-core/blob/3c8eb0841795b3f0f17fde5aad67a37f73726224/engines/serving/src/promoter_brain_serving/studio/app.py#L316) |
| GET | `/api/salts` | [list_salts](https://github.com/PayMeService/promoter-brain-core/blob/3c8eb0841795b3f0f17fde5aad67a37f73726224/engines/serving/src/promoter_brain_serving/studio/app.py#L348) |
| GET | `/api/salts/suggest` | [suggest_salt](https://github.com/PayMeService/promoter-brain-core/blob/3c8eb0841795b3f0f17fde5aad67a37f73726224/engines/serving/src/promoter_brain_serving/studio/app.py#L364) |
| POST | `/api/salts` | [register_salt](https://github.com/PayMeService/promoter-brain-core/blob/3c8eb0841795b3f0f17fde5aad67a37f73726224/engines/serving/src/promoter_brain_serving/studio/app.py#L369) |
| GET | `/api/audit` | [audit](https://github.com/PayMeService/promoter-brain-core/blob/3c8eb0841795b3f0f17fde5aad67a37f73726224/engines/serving/src/promoter_brain_serving/studio/app.py#L378) |
| GET | `/` | [index](https://github.com/PayMeService/promoter-brain-core/blob/3c8eb0841795b3f0f17fde5aad67a37f73726224/engines/serving/src/promoter_brain_serving/studio/app.py#L392) |
