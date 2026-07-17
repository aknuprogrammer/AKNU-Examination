/**
 * Validate request payload using a Zod schema
 * @param {ZodSchema} schema Zod Schema definition
 * @param {string} source Source object on request ('body', 'query', 'params')
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      req[source] = schema.parse(req[source]);
      next();
    } catch (error) {
      next(error); // Pass Zod validation errors to errorHandler
    }
  };
}
