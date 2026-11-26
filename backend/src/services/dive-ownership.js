const AppError = require("../errors/app-error");
const diveRepository = require("../repositories/dive.repository");

// Another user's dive answers exactly like a missing one (TD-003).
function diveNotFound() {
  return new AppError(404, "DIVE_NOT_FOUND", "Dive not found");
}

async function assertDiveOwner(userId, diveId) {
  if (!(await diveRepository.existsForUser(diveId, userId))) throw diveNotFound();
}

module.exports = { diveNotFound, assertDiveOwner };
