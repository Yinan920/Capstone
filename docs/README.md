# SellerSense — Project Documentation

**SellerSense** is an AI-driven customer-feedback intelligence tool for small and medium e-commerce sellers. A seller uploads their store reviews as a CSV; the system scores sentiment, discovers complaint themes, extracts high-frequency complaint keywords, raises alerts, benchmarks against competitors and drafts replies — turning "we noticed the packaging problem in week six" into "we noticed it in week one".

| | |
|---|---|
| **Live application** | https://sellersense-ai.web.app |
| **Demo account** | `demo@novabrew.co` / `demo1234!` (Premium) — or register a free account |
| **Health check** | https://sellersense-ai.web.app/api/health |
| **Stack** | React 18 + TypeScript + Vite · FastAPI + SQLAlchemy 2.0 async · PostgreSQL 16 + pgvector · Anthropic Claude · Google Cloud Run + Cloud SQL + Firebase Hosting |
| **Documentation last verified** | **2026-08-24** — every command, count and result in these documents was executed on that date |

---

## Table of contents

### Required documentation

| # | Document | What it contains |
|---|---|---|
| **1** | **[Production Support & Testing Scenarios](01-production-support.md)** | Service dependency diagram · monitoring (logs, health checks, metrics) · 8 incident playbooks · full test inventory with executed results (44 backend, 20 frontend, 3 browser E2E suites, 17 manual cases) · post-deployment smoke tests |
| **2** | **[System Setup Instructions](02-setup-guide.md)** | Prerequisites · database, backend and frontend setup step by step · every environment variable · secrets management · build and deployment · a 9-point validation checklist · setup troubleshooting |
| **3** | **[Issue Diagnosis, Research, Resolution & Sharing](03-issue-log.md)** | 16 issues, each with symptom, environment, reproduction, diagnosis, research sources, resolution and verification — including the instructor's paid-tier feedback and how it was resolved |
| **4** | **[System Usage Guide](04-user-guide.md)** | Written for non-developers: how to get in, five step-by-step workflows with screenshots, known limitations, troubleshooting, support contact |
| **5** | **[Architecture](05-architecture.md)** | Labelled architecture diagram · component roles · communication flows including the async analysis sequence · environments · key decisions · deployment pipeline · security considerations |

### Supporting reference documents

| Document | What it contains |
|---|---|
| [api-spec.md](api-spec.md) | All 16 API endpoints with sample request/response JSON |
| [db-design.md](db-design.md) | Entity-relationship diagram and table DDL for all 9 tables |
| [deployment.md](deployment.md) | The reproducible GCP deployment sequence, plus the cloud-specific "decisions and pitfalls" write-up |
| [benchmarks.md](benchmarks.md) | Every performance figure quoted anywhere in the project, with the method used to obtain it — and what it deliberately does not claim |
| [test-cases.md](test-cases.md) / [test-results.md](test-results.md) | The API-level test case catalogue and its raw executed output |

### Diagrams

| File | Used in |
|---|---|
| [images/architecture.svg](images/architecture.svg) | §5 — full system architecture, all components, flows and environments |
| [images/service-dependencies.svg](images/service-dependencies.svg) | §1 — dependency map with the blast radius of each failure |
| [images/guide/](images/guide/) | §4 — 17 screenshots captured from the live deployment on 2026-08-24 |

---

## Where to start

| If you are… | Read |
|---|---|
| **Grading this project** | This page, then §1 → §5 in order |
| **A new developer joining** | [§2 Setup](02-setup-guide.md), then [§5 Architecture](05-architecture.md), then [§3 Issues](03-issue-log.md) so you don't rediscover them |
| **On call for this system** | [§1.2 Monitoring](01-production-support.md#12-monitoring--where-to-look) and [§1.4 Incident playbooks](01-production-support.md#14-common-incidents--recovery-steps) |
| **A user of the product** | [§4 Usage Guide](04-user-guide.md) — no technical background needed |
| **Evaluating what does not work yet** | [§1.6.5](01-production-support.md#165-what-is-not-tested-stated-honestly), [§4.8](04-user-guide.md#48-known-limitations--gotchas) and [§5.8 known gaps](05-architecture.md#known-gaps-honest-list) |

---

## Assignment requirement coverage

| Requirement | Where it is answered |
|---|---|
| Service dependency diagram | [§1.1](01-production-support.md#11-service-dependency-diagram) — diagram plus a dependency table with failure impact |
| Monitoring (log locations, health checks) | [§1.2](01-production-support.md#12-monitoring--where-to-look) |
| Common incidents & recovery steps | [§1.4](01-production-support.md#14-common-incidents--recovery-steps) — 8 playbooks, each symptom → confirm → recover → verify |
| Unit, integration and end-to-end test cases | [§1.6.1](01-production-support.md#161-backend-unit--integration-tests-pytest--44-passed), [§1.6.2](01-production-support.md#162-frontend-unit--component-tests-vitest--20-passed), [§1.6.3](01-production-support.md#163-end-to-end-browser-tests-playwright--3-suites-passed) |
| Manual test cases, expected vs actual | [§1.6.4](01-production-support.md#164-manual-test-cases-expected-vs-actual) — 17 cases with screenshot evidence |
| Post-deployment smoke tests | [§1.5](01-production-support.md#15-post-deployment-smoke-tests-system-validation) — 10 automated checks, executed and recorded |
| Prerequisites | [§2.1](02-setup-guide.md#21-prerequisites) |
| Installation: frontend, backend, database separately | [§2.3](02-setup-guide.md#23-database-setup-postgresql-16--pgvector), [§2.4](02-setup-guide.md#24-backend-setup-fastapi), [§2.5](02-setup-guide.md#25-frontend-setup-react--vite) |
| Configuration details & secrets management | [§2.6](02-setup-guide.md#26-configuration-reference-every-environment-variable), [§2.7](02-setup-guide.md#27-secrets-management) |
| Build and deployment steps | [§2.8](02-setup-guide.md#28-build-and-deployment) |
| Setup validation | [§2.9](02-setup-guide.md#29-full-stack-validation-checklist) — 9 checks with expected output |
| Issue: description, environment, reproduction, diagnosis, research, resolution, verification | [§3](03-issue-log.md) — all 16 issues follow that template |
| Accessing the application, test credentials | [§4.1](04-user-guide.md#41-getting-in) |
| Navigating key features (screenshots) | [§4.2](04-user-guide.md#42-a-tour-of-the-screens) and the workflows, 17 screenshots |
| Main workflows, step by step | [§4.3–4.7](04-user-guide.md#43-workflow-1--analyse-your-reviews-5-minutes) |
| Known limitations / gotchas | [§4.8](04-user-guide.md#48-known-limitations--gotchas) |
| Support contact | [§4.10](04-user-guide.md#410-support) |
| Architecture diagram: components, flows, environments | [§5.1](05-architecture.md#51-high-level-architecture-diagram), [§5.2](05-architecture.md#52-components-and-their-roles), [§5.3](05-architecture.md#53-communication-flows), [§5.5](05-architecture.md#55-hosting-and-deployment-environments) |
| *Optional:* deployment pipeline overview | [§5.7](05-architecture.md#57-deployment-pipeline-optional-section) |
| *Optional:* security considerations | [§5.8](05-architecture.md#58-security-considerations-optional-section) |

---

## System status at the time of writing

Everything below was executed on **2026-08-24**, locally on macOS 15 and against the live deployment.

| Check | Result |
|---|---|
| Backend test suite (`pytest`) | ✅ **44 passed** in 19.8 s |
| Frontend test suite (`npm test`) | ✅ **20 passed** in 8 files, 5.2 s |
| Local API smoke (`scripts/smoke.sh`) | ✅ 13/13 steps |
| Post-deployment smoke (`scripts/smoke_cloud.sh`) | ✅ **10/10** against the live URL |
| Browser E2E — acceptance / upgrade / delete | ✅ all three suites passed against the live URL |
| Live service health | ✅ `{"status":"ok","database":"up","version":"0.1.0"}` |

One regression was found and fixed during this documentation pass — the end-to-end suite's timing and string assumptions no longer matched a production that runs real Claude. It is written up in full as [§3, issue 14](03-issue-log.md#issue-14--e2e-suite-broke-when-production-switched-from-mock-adapters-to-real-claude).
