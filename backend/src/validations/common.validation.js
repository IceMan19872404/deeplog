const { z } = require("zod");

// Path IDs arrive as strings; a BIGSERIAL id is a positive integer.
const positiveIdString = (message) => z.string().regex(/^[1-9]\d*$/, message);

module.exports = { positiveIdString };
