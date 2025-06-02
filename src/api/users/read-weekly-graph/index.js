const pool = require('../../../utils/db');
const { DateTime } = require('luxon');

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

  const today = DateTime.now().setZone('Asia/Seoul').startOf('day');
  const startDate = today.minus({ days: 6 });

  const response = [];
  for (let i = 0; i < 7; i++) {
    response.push({
      date: startDate.plus({ days: i }).toFormat('yyyy-MM-dd'),
      caloriesBurnedOutside: 0,
      caloriesBurnedWithUs: 0,
    });
  }

  try {
    const [caloriesBurnedOutsideRows] = await pool.query(
      'SELECT user_id, calories_fitbit, date FROM fitbit_data WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC LIMIT 7',
      [userId, startDate.toFormat('yyyy-MM-dd'), today.toFormat('yyyy-MM-dd')]
    );

    for (const { calories_fitbit, date } of caloriesBurnedOutsideRows) {
      const index = DateTime.fromJSDate(date)
      .setZone('Asia/Seoul')
      .startOf('day')
      .diff(startDate, 'days').days;
      if (index >= 0 && index < 7) {
        response[index].caloriesBurnedOutside = calories_fitbit;
      }
    }

    const [caloriesBurnedWithUsRows] = await pool.query(
      'SELECT user_id, calories_rsp, date FROM rsp_move_data WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC LIMIT 7',
      [userId, startDate.toFormat('yyyy-MM-dd'), today.toFormat('yyyy-MM-dd')]
    );

    for (const { calories_rsp, date } of caloriesBurnedWithUsRows) {
      const index = DateTime.fromJSDate(date)
      .setZone('Asia/Seoul')
      .startOf('day')
      .diff(startDate, 'days').days;
      if (index >= 0 && index < 7) {
        response[index].caloriesBurnedWithUs = calories_rsp;
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify(response),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ detail: err.message }),
    };
  }
};
