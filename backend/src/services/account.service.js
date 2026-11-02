const bcrypt = require("bcryptjs");
const path = require("path");
const database = require("../config/database");
const AppError = require("../errors/app-error");
const photoService = require("./dive-photo.service");

async function deleteAccount(userId, input) {
  const client = await database.pool.connect();
  let storageKeys = [];

  try {
    await client.query("BEGIN");
    const userResult = await client.query(
      `SELECT u.password_hash, p.photo_storage_key
         FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id
        WHERE u.id = $1 FOR UPDATE OF u`,
      [userId]
    );
    const user = userResult.rows[0];
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

    const photosResult = await client.query(
      `SELECT p.storage_key
         FROM dive_photos p
         JOIN dives d ON d.id = p.dive_id
        WHERE d.user_id = $1`,
      [userId]
    );
    storageKeys = photosResult.rows.map((row) => row.storage_key);
    if (user.photo_storage_key) storageKeys.push(user.photo_storage_key);
    await client.query("DELETE FROM users WHERE id = $1", [userId]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  await photoService.removeFiles(storageKeys.map((key) => path.basename(key)));
  return { deleted: true, removedPhotoFiles: storageKeys.length };
}

module.exports = { deleteAccount };
