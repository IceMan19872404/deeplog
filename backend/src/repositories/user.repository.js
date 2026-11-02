const database = require("../config/database");

const userColumns = `
  id, first_name, last_name, second_last_name, email, password_hash,
  created_at, updated_at
`;

async function findByEmail(email) {
  const result = await database.query(
    `SELECT ${userColumns}
       FROM users
      WHERE LOWER(email) = LOWER($1)`,
    [email]
  );

  return result.rows[0] || null;
}

async function findById(id) {
  const result = await database.query(
    `SELECT ${userColumns}
       FROM users
      WHERE id = $1`,
    [id]
  );

  return result.rows[0] || null;
}

async function create(user) {
  const result = await database.query(
    `INSERT INTO users (
       first_name, last_name, second_last_name, email, password_hash
     )
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, first_name, last_name, second_last_name, email,
               created_at, updated_at`,
    [
      user.firstName,
      user.lastName,
      user.secondLastName || null,
      user.email,
      user.passwordHash
    ]
  );

  return result.rows[0];
}

module.exports = {
  findByEmail,
  findById,
  create
};
