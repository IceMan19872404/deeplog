const bcrypt = require("bcryptjs");
const AppError = require("../errors/app-error");
const accountRepository = require("../repositories/account.repository");
const { withTransaction } = require("../config/database");
const { removeFiles } = require("./photo-files");

async function deleteAccount(userId, input) {
  const storageKeys = await withTransaction(async (client) => {
    const user = await accountRepository.lockForDeletion(userId, client);
    const passwordMatches = user &&
      (await bcrypt.compare(input.password, user.password_hash));

    if (!passwordMatches) {
      throw new AppError(
        400,
        "INVALID_ACCOUNT_PASSWORD",
        "Password is incorrect",
        [{ field: "password", message: "Password is incorrect" }]
      );
    }

    const photos = await accountRepository.findAllPhotoFiles(userId, client);
    const keys = photos.map((photo) => photo.storage_key);
    if (user.photo_storage_key) keys.push(user.photo_storage_key);
    await accountRepository.deleteUser(userId, client);
    return keys;
  });

  // Files go only after COMMIT, so a failed deletion never loses photos.
  await removeFiles(storageKeys);
  return { deleted: true, removedPhotoFiles: storageKeys.length };
}

module.exports = { deleteAccount };
