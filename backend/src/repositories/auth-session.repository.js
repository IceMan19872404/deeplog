const { pool } = require("../config/database");
const crypto = require("node:crypto");

function secretsMatch(first, second) {
  const left = Buffer.from(first || "");
  const right = Buffer.from(second || "");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

const userColumns = `
  u.id AS account_id, u.first_name, u.last_name, u.second_last_name, u.email,
  u.created_at AS account_created_at, u.updated_at AS account_updated_at
`;

async function create(session) {
  await pool.query(
    `INSERT INTO auth_sessions (
       id, family_id, user_id, token_hash, csrf_hash, expires_at
     ) VALUES ($1, $2, $3, $4, $5, $6)`,
    [session.id, session.familyId, session.userId, session.tokenHash, session.csrfHash, session.expiresAt]
  );
}

async function rotate(currentTokenHash, csrfHash, replacement) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `SELECT s.*, ${userColumns}
         FROM auth_sessions s
         JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = $1
        FOR UPDATE OF s`,
      [currentTokenHash]
    );
    const session = result.rows[0];

    if (!session || !secretsMatch(session.csrf_hash, csrfHash)) {
      await client.query("ROLLBACK");
      return { status: "invalid" };
    }
    if (session.revoked_at || session.replaced_by) {
      await client.query(
        "UPDATE auth_sessions SET revoked_at = COALESCE(revoked_at, NOW()) WHERE family_id = $1",
        [session.family_id]
      );
      await client.query("COMMIT");
      return { status: "reused" };
    }
    if (new Date(session.expires_at) <= new Date()) {
      await client.query("UPDATE auth_sessions SET revoked_at = NOW() WHERE id = $1", [session.id]);
      await client.query("COMMIT");
      return { status: "expired" };
    }

    await client.query(
      `INSERT INTO auth_sessions (
         id, family_id, user_id, token_hash, csrf_hash, expires_at
       ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [replacement.id, session.family_id, session.user_id, replacement.tokenHash, replacement.csrfHash, replacement.expiresAt]
    );
    await client.query(
      `UPDATE auth_sessions
          SET revoked_at = NOW(), replaced_by = $1, last_used_at = NOW()
        WHERE id = $2`,
      [replacement.id, session.id]
    );
    await client.query("COMMIT");
    return {
      status: "rotated",
      session,
      user: {
        id: session.account_id,
        first_name: session.first_name,
        last_name: session.last_name,
        second_last_name: session.second_last_name,
        email: session.email,
        created_at: session.account_created_at,
        updated_at: session.account_updated_at
      }
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function revokeFamily(tokenHash, csrfHash) {
  const result = await pool.query(
    `UPDATE auth_sessions
        SET revoked_at = COALESCE(revoked_at, NOW())
      WHERE family_id = (
        SELECT family_id FROM auth_sessions
         WHERE token_hash = $1 AND csrf_hash = $2
      )`,
    [tokenHash, csrfHash]
  );
  return result.rowCount > 0;
}

async function revokeAllForUser(userId) {
  await pool.query(
    "UPDATE auth_sessions SET revoked_at = COALESCE(revoked_at, NOW()) WHERE user_id = $1",
    [userId]
  );
}

async function hasActiveFamily(userId, familyId) {
  const result = await pool.query(
    `SELECT 1 FROM auth_sessions
      WHERE user_id = $1 AND family_id = $2
        AND revoked_at IS NULL AND expires_at > NOW()
      LIMIT 1`,
    [userId, familyId]
  );
  return result.rowCount === 1;
}

module.exports = { create, rotate, revokeFamily, revokeAllForUser, hasActiveFamily };
