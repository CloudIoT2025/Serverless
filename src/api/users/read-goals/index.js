const pool = require('../../../utils/db');

exports.handler = async (event) => {
  const userId = event.headers['x-user-id'];

  if (!userId) {
    return {
      statusCode: 401,
      headers: {
        'WWW-Authenticate': 'Bearer',
      },
      body: JSON.stringify({ error: 'Unauthorized' }),
    };
  }

  try {
    const [rows] = await pool.query('SELECT goal_calories FROM users WHERE id = ?', [userId]);

    if (!rows.length) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User not found' }),
      };
    }

    const goal = rows[0].goal_calories;

    return {
      statusCode: 200,
      body: JSON.stringify({ goal }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ detail: err.message }),
    };
  }
};
