const { pool } = require("../config/database");

async function replaceForUser(userId, tokenHash, expiresAt) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
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
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function consume(tokenHash, passwordHash) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
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

    if (!token) {
      await client.query("ROLLBACK");
      return false;
    }

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
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  replaceForUser,
  consume
};
