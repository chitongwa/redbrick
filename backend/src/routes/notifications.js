// ── Notification template admin routes ──
// GET    /notifications/templates            List every template (grouped by tier)
// GET    /notifications/templates/:key       Single template
// PUT    /notifications/templates/:key       Update SMS/push copy + channel toggles
// POST   /notifications/templates/:key/preview  Render against a sample context
// POST   /notifications/templates/:key/test     Send a test SMS/push to a phone
// GET    /notifications/log                  Delivery log (admin view)

import { Router } from 'express';
import { query } from '../config/db.js';
import {
  getAllTemplates,
  getTemplate,
  updateTemplate,
  previewTemplate,
  sendTestNotification,
  clearTemplateCache,
} from '../services/notifications.js';

const router = Router();

// ── GET /notifications/templates ──────────────────────────────────────────
router.get('/templates', async (_req, res) => {
  try {
    const map = await getAllTemplates(true);
    const templates = Object.values(map);
    // Group by tier for the admin UI
    const grouped = {
      tier1:     templates.filter((t) => t.tier === 'tier1'),
      tier2:     templates.filter((t) => t.tier === 'tier2'),
      milestone: templates.filter((t) => t.tier === 'milestone'),
    };
    res.json({ templates, grouped });
  } catch (err) {
    console.error('[notifications] list templates error:', err);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// ── GET /notifications/templates/:key ─────────────────────────────────────
router.get('/templates/:key', async (req, res) => {
  try {
    const template = await getTemplate(req.params.key);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json({ template });
  } catch (err) {
    console.error('[notifications] get template error:', err);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// ── PUT /notifications/templates/:key ─────────────────────────────────────
router.put('/templates/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const existing = await getTemplate(key);
    if (!existing) return res.status(404).json({ error: 'Template not found' });

    const patch = {};
    if (typeof req.body.sms_body    === 'string')  patch.sms_body   = req.body.sms_body;
    if (typeof req.body.push_title  === 'string')  patch.push_title = req.body.push_title;
    if (typeof req.body.push_body   === 'string')  patch.push_body  = req.body.push_body;
    if (typeof req.body.sms_enabled === 'boolean') patch.sms_enabled  = req.body.sms_enabled;
    if (typeof req.body.push_enabled === 'boolean') patch.push_enabled = req.body.push_enabled;

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'No updatable fields supplied' });
    }

    // Basic length guards
    if (patch.sms_body && patch.sms_body.length > 600) {
      return res.status(400).json({ error: 'sms_body is too long (max 600 chars)' });
    }
    if (patch.push_title && patch.push_title.length > 120) {
      return res.status(400).json({ error: 'push_title is too long (max 120 chars)' });
    }
    if (patch.push_body && patch.push_body.length > 240) {
      return res.status(400).json({ error: 'push_body is too long (max 240 chars)' });
    }

    const updated = await updateTemplate(key, patch, req.body.updated_by || 'admin');
    res.json({ message: 'Template updated', template: updated });
  } catch (err) {
    console.error('[notifications] update template error:', err);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// ── POST /notifications/templates/:key/reset ──────────────────────────────
// Admin reset — wipes user edits by reloading the seed defaults from SQL.
router.post('/templates/:key/reset', async (req, res) => {
  try {
    // We re-seed by deleting + inserting the canonical default row.
    // Callers typically re-run the 007 migration in prod; here we just
    // clear the cache and signal success.
    clearTemplateCache();
    const template = await getTemplate(req.params.key);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json({
      message: 'Template cache cleared — re-run migration 007 to fully reset to seed defaults',
      template,
    });
  } catch (err) {
    console.error('[notifications] reset template error:', err);
    res.status(500).json({ error: 'Failed to reset template' });
  }
});

// ── POST /notifications/templates/:key/preview ────────────────────────────
router.post('/templates/:key/preview', async (req, res) => {
  try {
    const preview = await previewTemplate(req.params.key, req.body?.context || {});
    if (!preview) return res.status(404).json({ error: 'Template not found' });
    res.json({ preview });
  } catch (err) {
    console.error('[notifications] preview error:', err);
    res.status(500).json({ error: 'Failed to preview template' });
  }
});

// ── POST /notifications/templates/:key/test ───────────────────────────────
// Send a real test notification to an arbitrary phone number.
router.post('/templates/:key/test', async (req, res) => {
  try {
    const { phone, user_id, context } = req.body || {};
    if (!phone) return res.status(400).json({ error: 'phone is required' });

    const result = await sendTestNotification({
      key:     req.params.key,
      phone,
      userId:  user_id,
      context: context || {},
    });

    if (!result.success) {
      return res.status(404).json({ error: result.error || 'Failed to send test' });
    }
    res.json({ message: 'Test notification dispatched', ...result });
  } catch (err) {
    console.error('[notifications] test send error:', err);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

// ── GET /notifications/log ────────────────────────────────────────────────
// Admin delivery log — useful for auditing failures.
router.get('/log', async (req, res) => {
  try {
    const limit  = Math.min(200, Math.max(1, parseInt(req.query.limit || '50', 10)));
    const result = await query(
      `SELECT id, template_key, user_id, phone_number, channel, status,
              provider, provider_ref, rendered_body, error_message, created_at
       FROM notification_log
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    res.json({ log: result.rows });
  } catch (err) {
    console.error('[notifications] log error:', err);
    res.status(500).json({ error: 'Failed to fetch log' });
  }
});

export default router;
