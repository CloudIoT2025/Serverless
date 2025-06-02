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
    const [rows] = await pool.query('SELECT id FROM users WHERE id = ?', [userId]);
    if (!rows.length || rows[0].id.toString() !== userId) {
      return {
        statusCode: 401,
        headers: {
          'WWW-Authenticate': 'Bearer',
        },
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    // 인증 성공 후 칼로리 데이터 조회
    const [[caloriesBurnedWithUsRows]] = await pool.query(
      'SELECT calories_rsp FROM rsp_move_data WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1',
      [userId]
    );
    const caloriesBurnedWithUs = caloriesBurnedWithUsRows?.calories_rsp ?? 0;

    const [[caloriesBurnedOutsideRows]] = await pool.query(
      'SELECT calories_fitbit FROM fitbit_data WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1',
      [userId]
    );
    const caloriesBurnedOutside = caloriesBurnedOutsideRows?.calories_fitbit ?? 0;

    const [[caloriesToBurnRows]] = await pool.query(
      'SELECT goal_calories FROM users WHERE id = ?',
      [userId]
    );
    const caloriesToBurn = caloriesToBurnRows?.goal_calories ?? 0;

    return {
      statusCode: 200,
      body: JSON.stringify({
        caloriesToBurn,
        caloriesBurnedOutside,
        caloriesBurnedWithUs,
      }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};
