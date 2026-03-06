# Copia

**Cross-jurisdiction wealth & estate intelligence.**

Copia is an AI-native and MCP tool that helps internationally mobile individuals understand their tax obligations, inheritance exposure, and estate planning options across multiple countries simultaneously. It extends into cross-border capital mobility: what you can actually *do* with money in a foreign jurisdiction, what it costs, and what you need to file.

## Demo

[![Copia Demo](https://img.youtube.com/vi/XwQ56j2dOQ0/maxresdefault.jpg)](https://youtu.be/XwQ56j2dOQ0)
**Click to Watch the Demo**

## Architecture

Copia follows a strict three-layer separation where each layer does only what it does best:

```
User ──→ [AI Input Layer] ──→ Structured Params ──→ [Rule Engine] ──→ Structured Results ──→ [AI Output Layer] ──→ Narrated Plan
```

**The AI never generates financial figures. The rule engine never talks to users.**

| Layer | Responsibility | Implementation |
|-------|---------------|----------------|
| AI Input | Parse natural language into structured `UserProfile` parameters | Claude via Vercel AI SDK, Zod schema validation |
| Rule Engine | Deterministic computation across jurisdiction graph | Pure TypeScript functions, zero randomness, full audit trail |
| AI Output | Narrate structured results with cited sources | Claude with confidence-calibrated language, citation checks |

This separation is enforced architecturally, not just by convention. Three post-generation guardrails verify every AI output against the rule engine's structured data before delivery.

## Technical Complexity

### 1. Multi-Jurisdiction Treaty Graph

The rule engine models jurisdictions as nodes and bilateral tax treaties as edges. When a user spans N countries, the engine traverses all `N*(N-1)/2` treaty pairs and resolves conflicts between them. This is a genuine graph problem: the US-UK treaty may allocate taxing rights one way while the US-India treaty allocates them differently, and a user spanning all three faces a "triangular case" where bilateral relief doesn't fully resolve the overlap.

The 7-step resolution pipeline handles this:

1. **Residency determination** per jurisdiction (citizenship-based for US, domicile-based for UK, days-count for India)
2. **Treaty identification** for every jurisdiction pair with exposure
3. **Tie-breaker resolution** using ordered criteria (permanent home → vital interests → habitual abode → nationality)
4. **Domestic liability calculation** as if no treaty existed
5. **Treaty relief application** (credit method or exemption method, per-asset-class)
6. **Trilateral gap detection** for 3+ jurisdiction situations
7. **Consolidation** into a single `PlanResult` with net liabilities, conflicts, and citations

Each step is a pure function that returns an `AuditEntry`, creating a complete reasoning chain that can be inspected at any point.

### 2. Conflicting Tax Bases

Different countries use fundamentally incompatible bases for taxation:

- **US**: Citizenship-based (globally unique) — taxes citizens worldwide regardless of where they live
- **UK**: Domicile-based — a common-law concept involving *intention* about permanent home, with a "deemed domicile" threshold at 15 years of residence
- **India**: Residency-based — multiple days-count thresholds creating NRI/RNOR/Resident categories with different asset-class scoping
- **Portugal**: Territorial with NHR exceptions — recently restructured regime with favorable treatment window

These cannot be reconciled with a lookup table. The engine applies each jurisdiction's test independently, identifies where multiple jurisdictions claim taxing rights on the same assets, and then resolves overlaps through the treaty graph.

### 3. Capital Mobility Analysis

Beyond "what do you owe," Copia answers "what can you actually *do*" with money in a foreign jurisdiction. The capital mobility module models:

- **Status determination**: NRI vs. OCI vs. PIO vs. former citizen — each with different property ownership, account, and repatriation rights
- **Capital controls**: India's FEMA outbound limits ($1M/year NRI repatriation), account structure requirements (NRE/NRO/FCNR), RBI approval thresholds
- **5-layer cost stack**: Source country tax → destination country tax → treaty relief → transfer costs → timing considerations
- **Permitted actions map**: A structured enumeration of everything the user is legally allowed to do — in the source country, destination, and third countries — with each option traced to its regulatory basis

The permitted actions map explicitly includes prohibited actions with their citations. Telling a user they *cannot* buy agricultural land in India (FEMA Notification 21(R)/2018) is as valuable as telling them they *can* buy residential property.

### 4. Three-Layer Guardrail System

Every AI-generated output passes through three programmatic checks before delivery:

- **Citation check**: Extracts all numbers from the narration and verifies each exists in the `PlanResult`. Figures not present in the structured output are flagged.
- **Confidence check**: Verifies that language tone matches the confidence tier. Statutory findings must use definitive language; advisory findings must use hedged language. Keyword heuristics detect mismatches.
- **Sanity check**: Validates logical consistency — no liability exceeding total asset value, no conflicting residency determinations that weren't flagged, no reliance on sunset rules.

These are not prompt instructions. They are post-generation functions that inspect the AI's output against the rule engine's structured data.

### 5. Temporal Rule Interactions

Estate planning involves rules that interact across time:

- UK potentially exempt transfers follow a 7-year clawback rule
- The US estate tax exemption is scheduled to halve (sunset provision)
- Portugal's NHR regime was recently restructured, affecting new vs. existing applicants
- India's deemed domicile timing creates critical planning windows (e.g., Priya's year-14 vs. year-15 UK residence changes her worldwide IHT exposure)

The engine tracks `lastVerified` dates and `sunset` provisions on every rule. Plans that rely on expiring rules include prominent warnings. Rules not verified within 90 days are automatically downgraded from statutory to interpretive confidence.

### 6. MCP Server as Universal Interface

The rule engine is exposed as an MCP server with 11 tools (8 core + 3 capital mobility), making it consumable by Claude in claude.ai, the custom frontend, a third-party advisor tool, or an automated compliance pipeline — same interface, different consumer.

## Monorepo Structure

```
packages/
  types/          Shared TypeScript interfaces (CountryCode, PlanResult, MoneyEvent, etc.)
  data-service/   External data sourcing (Frankfurter FX API, OECD, HMRC, static fallbacks + cache)
  rule-engine/    7-step pipeline + capital mobility module (pure functions, no side effects)
  mcp-server/     MCP server with 11 tools + Zod schemas
  ai-layer/       Vercel AI SDK integration, input parsing, output narration, guardrails
  server/         Express API server bridging AI layer to frontend
  frontend/       Vite + React + Tailwind + Jotai (9 pages, progressive disclosure L0–L3)
evals/            Vitest test suite + AI eval harness
demo/             Mock server for API-key-free screen recording
```

## Testing

**78 tests** across four evaluation layers:

| Layer | What it tests | Target |
|-------|--------------|--------|
| Rule engine unit tests | Deterministic tax calculations, currency conversion, treaty relief | 100% pass (deterministic) |
| AI input parsing evals | Entity extraction from natural language into structured profiles | >95% precision, >90% recall |
| AI output faithfulness evals | Narration accuracy against structured `PlanResult` | >95% faithfulness |
| Golden end-to-end scenarios | Full pipeline with expert-reviewed expected outputs | Regression gate |

Golden personas: **Marcus Chen** (US citizen, UK 12yr resident, London flat + US brokerage, non-citizen spouse) and **Priya Sharma** (Indian NRI, UK 14yr resident, inherited Mumbai property, deemed-domicile timing window).

## Quick Start

```bash
# Install
pnpm install

# Run tests
pnpm test

# Development (requires ANTHROPIC_API_KEY in .env)
pnpm dev

# Demo mode (no API key needed — hardcoded AI responses)
./demo/start.sh
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Rule Engine | TypeScript (strict), pure functions, Vitest |
| MCP Server | TypeScript MCP SDK, Zod schemas |
| AI Integration | Vercel AI SDK (Anthropic/OpenAI/Google provider-agnostic) |
| Frontend | React 18, TypeScript, Tailwind CSS, Jotai, React Router |
| Data | Frankfurter FX API, OECD, HMRC (with cache + static fallbacks) |
| Eval Harness | Vitest + Claude-as-judge for AI evals |

## Key Design Decisions

- **Jurisdictions are data, not code.** Adding a country means adding a node (domestic rules) and edges (treaty relationships). The engine, prompts, and UI stay unchanged.
- **Pipeline steps are pure functions.** Each returns an `AuditEntry`, creating a fully inspectable reasoning chain. No side effects during computation.
- **Exchange rates cascade gracefully.** Frankfurter API → in-memory cache → hardcoded fallback. Rates older than 24 hours trigger a staleness warning.
- **Confidence tiers propagate end-to-end.** Every finding carries a tier (statutory/interpretive/advisory) from the rule engine through narration to the UI badge. The AI's language is constrained to match.
- **Progressive disclosure (L0–L3).** Every output can be viewed at headline, explanation, citation, or raw-data depth. The same data, four levels of detail.
