const { withTransaction } = require("../config/database");

async function replaceForUser(userId, tokenHash, expiresAt) {
  await withTransaction(async (client) => {
    await client.query(
      `DELETE FROM password_reset_tokens
        WHERE user_id = $1 AND used_at IS NULL`,
      [userId]
    );
    await client.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiresAt]
    );
  });
}

// Uses a valid token once: sets the new password, discards the user's other
// reset tokens and revokes every session, all in one transaction.
async function consume(tokenHash, passwordHash) {
  return withTransaction(async (client) => {
    const tokenResult = await client.query(
      `SELECT id, user_id
         FROM password_reset_tokens
        WHERE token_hash = $1
          AND used_at IS NULL
          AND expires_at > NOW()
        FOR UPDATE`,
      [tokenHash]
    );
    const token = tokenResult.rows[0];
    if (!token) return false;

    await client.query(
      `UPDATE users
          SET password_hash = $1, updated_at = NOW()
        WHERE id = $2`,
      [passwordHash, token.user_id]
    );
    await client.query(
      `UPDATE password_reset_tokens
          SET used_at = NOW()
        WHERE id = $1`,
      [token.id]
    );
    await client.query(
      `DELETE FROM password_reset_tokens
        WHERE user_id = $1 AND id <> $2`,
      [token.user_id, token.id]
    );
    await client.query(
      `UPDATE auth_sessions
          SET revoked_at = COALESCE(revoked_at, NOW())
        WHERE user_id = $1`,
      [token.user_id]
    );
    return true;
  });
}

module.exports = {
  replaceForUser,
  consume
};
