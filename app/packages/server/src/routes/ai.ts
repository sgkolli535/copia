import { Router } from 'express';
import type { CoreMessage } from 'ai';
import {
  narratePlan,
  narrateMobility,
  parseMoneyEvent,
  suggestScenarios,
} from '@copia/ai-layer';
import { runAgent } from '../agent/run-agent.js';

export const aiRoutes = Router();

// ── Agentic chat endpoint ───────────────────────────────────────────────────
aiRoutes.post('/chat', async (req, res) => {
  try {
    const { messages, sessionId } = req.body as {
      messages: CoreMessage[];
      sessionId?: string;
    };
    const result = await runAgent(messages, sessionId);
    res.json(result);
  } catch (err) {
    console.error('chat error:', err);
    res.status(500).json({ error: String(err) });
  }
});

// ── Direct AI layer endpoints (kept for form-based flows) ───────────────────

aiRoutes.post('/narrate-plan', async (req, res) => {
  try {
    const { plan } = req.body;
    const narration = await narratePlan(plan);
    res.json({ narration });
  } catch (err) {
    console.error('narrate-plan error:', err);
    res.status(500).json({ error: String(err) });
  }
});

aiRoutes.post('/narrate-mobility', async (req, res) => {
  try {
    const { result } = req.body;
    const stream = await narrateMobility(result);
    const text = await stream.text;
    res.json({ narration: text });
  } catch (err) {
    console.error('narrate-mobility error:', err);
    res.status(500).json({ error: String(err) });
  }
});

aiRoutes.post('/parse-money-event', async (req, res) => {
  try {
    const { input, context } = req.body;
    const parsed = await parseMoneyEvent(input, context);
    res.json(parsed);
  } catch (err) {
    console.error('parse-money-event error:', err);
    res.status(500).json({ error: String(err) });
  }
});

aiRoutes.post('/suggest-scenarios', async (req, res) => {
  try {
    const { plan } = req.body;
    const suggestions = await suggestScenarios(plan);
    res.json({ suggestions });
  } catch (err) {
    console.error('suggest-scenarios error:', err);
    res.status(500).json({ error: String(err) });
  }
});
