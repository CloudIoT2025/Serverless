const pool = require('./utils/db');

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

  let goal;
  try {
    const body = JSON.parse(event.body);
    goal = body.goal;
  } catch (e) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON body or missing "goal"' }),
    };
  }

  try {
    await pool.query('UPDATE users SET goal_calories = ? WHERE id = ?', [goal, userId]);

    return {
      statusCode: 200,
      body: JSON.stringify({ goal }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
