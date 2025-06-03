const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const pool = require('./utils/db');

exports.handler = async (event) => {
  const userId = event.pathParameters?.userId;

  if (!userId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Missing userId in path' }),
    };
  }

  try {
    const [rows] = await pool.query(
      'SELECT id as userId FROM users WHERE id = ?',
      [userId]
    );

    if (!rows.length) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'User not found' }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(rows[0]),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};
