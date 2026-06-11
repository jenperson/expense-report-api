const Joi = require('joi');

// BUG: The amount field is missing .positive() — negative values pass validation.
// A submitted expense with amount: -150 will be accepted and saved to the database,
// causing incorrect totals in expense reports.
// Fix: change Joi.number().required() to Joi.number().positive().required()
const expenseSchema = Joi.object({
  amount: Joi.number().required(),
  currency: Joi.string().length(3).uppercase().default('USD'),
  category: Joi.string()
    .valid('travel', 'meals', 'lodging', 'office', 'other')
    .required(),
  description: Joi.string().min(3).max(500).required(),
  date: Joi.date().iso().required(),
  receipt_url: Joi.string().uri().optional(),
});

const expenseUpdateSchema = Joi.object({
  amount: Joi.number(),
  currency: Joi.string().length(3).uppercase(),
  category: Joi.string().valid('travel', 'meals', 'lodging', 'office', 'other'),
  description: Joi.string().min(3).max(500),
  date: Joi.date().iso(),
  receipt_url: Joi.string().uri().optional().allow(null),
}).min(1);

function validateExpense(req, res, next) {
  const { error, value } = expenseSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.details.map((d) => d.message),
    });
  }
  req.body = value;
  next();
}

function validateExpenseUpdate(req, res, next) {
  const { error, value } = expenseUpdateSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.details.map((d) => d.message),
    });
  }
  req.body = value;
  next();
}

module.exports = { validateExpense, validateExpenseUpdate };
