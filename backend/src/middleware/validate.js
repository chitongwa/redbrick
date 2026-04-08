// ── Request-body validation middleware factory ──

/**
 * Returns Express middleware that validates req.body against a schema.
 *
 * A schema is an object of { fieldName: validatorFn }.
 * Each validatorFn receives the field value and returns
 *   - null / undefined  → valid
 *   - a string          → error message for that field
 *
 * @param {Record<string, (v: any) => string|null>} schema
 */
export function validate(schema) {
  return (req, res, next) => {
    const errors = {};

    for (const [field, check] of Object.entries(schema)) {
      const msg = check(req.body[field]);
      if (msg) errors[field] = msg;
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    next();
  };
}
