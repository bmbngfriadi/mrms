const { errorResponse } = require('../utils/response');

function validateBody(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      const issues = err.issues || err.errors;
      if (issues && Array.isArray(issues)) {
        const errors = issues.map((e) => ({
          field: Array.isArray(e.path) ? e.path.join('.') : e.path,
          message: e.message,
        }));
        return errorResponse(res, 'Validasi data gagal.', 422, errors);
      }
      return errorResponse(res, err.message || 'Input tidak valid.', 422);
    }
  };
}

function validateQuery(schema) {
  return (req, res, next) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (err) {
      if (err.errors) {
        const errors = err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return errorResponse(res, 'Validasi parameter gagal.', 422, errors);
      }
      return errorResponse(res, 'Parameter tidak valid.', 400);
    }
  };
}

module.exports = {
  validateBody,
  validateQuery,
};
