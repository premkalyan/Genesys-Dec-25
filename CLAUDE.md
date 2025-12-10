# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **strategy and planning repository** for building a Genesys CX AI demo/PoC for Bounteous. It contains research documents, demo strategies, and implementation plans for showcasing AI capabilities that integrate with Genesys Cloud CX platform.

**This is NOT a code repository** - it contains markdown documentation for planning purposes.

## Key Documents

- `scope.txt` - Background on Genesys as a company, their platform stack, and what Bounteous should demonstrate
- `genesys-ai-demo-recommendations.md` - Primary demo/PoC recommendations with three options (Banking Virtual Agent, QA/Coaching, Journey Orchestration)
- `revised-demo-strategy-no-trial.md` - Fallback strategy for building without Genesys trial access, emphasizes showcasing Bounteous's existing fine-tuned SLM
- `ai-evaluation-validation-strategy.md` - Framework for validating AI models are production-ready (RAGAS metrics, evaluation harnesses, monitoring)
- `genesys-trial-access-research.md` - Research on available Genesys free trials (GCXNow 30-day, WEM 60-day)

## Context

**Target Audience:** Genesys (CX/Contact Center platform company)

**Bounteous Value Proposition:** Enterprise AI enhancement layer for Genesys Cloud - domain tuning, PII protection, governance, RAG systems

**Key Demo Concepts:**
1. Hero Moment #1: PII-safe RAG with policy citations
2. Hero Moment #2: Context-rich handoff to human agents (zero repetition)
3. Bounteous's internal fine-tuned SLM as proof point

**Technical Stack (Planned):**
- Genesys AI Studio, Web Messaging, Architect
- Vector DB (Pinecone/Weaviate) for RAG
- LLM orchestration (OpenAI/Claude)
- PII detection (Presidio or custom)
- Fine-tuned SLM (Phi-3 Mini)

## When Working on This Project

- These are planning documents, not implementation code
- Focus on strategy coherence across documents
- Respect the honest positioning approach (prototype vs. production-ready claims)
- Keep ROI claims realistic with ranges, not precise figures
