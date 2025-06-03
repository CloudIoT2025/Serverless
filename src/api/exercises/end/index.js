const pool = require('./utils/db');
const { DateTime } = require('luxon');
const { moveEnd } = require('../../../IoTCoreUtill/IoTCoreUtill');

exports.handler = async (event) => {
  const exerciseId = event.pathParameters?.exerciseId;
  const rspId = event.queryStringParameters?.rspId;
  const userId = event.headers['x-user-id'];

  if (!exerciseId || !rspId || !userId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'exerciseId (path), rspId (query), x-user-id (header)는 모두 필수입니다.' }),
    };
  }

  try {
    // s3_data에서 해당 운동 정보 조회
    const [rows] = await pool.query(
      'SELECT id, video_calories FROM s3_data WHERE video_id = ?',
      [exerciseId]
    );

    if (!rows.length) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: '해당 exerciseId에 대한 데이터가 없습니다.' }),
      };
    }

    const goal_calories = rows[0].video_calories;

    // MQTT로 Raspberry Pi로부터 칼로리 결과 수신
    const result = await moveEnd(rspId, 10000); // 10초 타임아웃 설정
    console.log(`/move/end/${rspId}: ${result}`);
    const ex_calories = Math.round(parseFloat(result.split(',')[0]));

    const now = DateTime.now().setZone('Asia/Seoul');
    const today = now.startOf('day');

    // 기존 데이터가 있다면 UPDATE, 없으면 INSERT
    const [existingRows] = await pool.query(
      'SELECT id, calories_rsp FROM rsp_move_data WHERE user_id = ? AND date = ?',
      [userId, today.toFormat('yyyy-MM-dd HH:mm:ss')]
    );

    if (existingRows.length > 0) {
      const { id, calories_rsp } = existingRows[0];
      await pool.query(
        'UPDATE rsp_move_data SET calories_rsp = ?, updated_at = ? WHERE id = ?',
        [calories_rsp + ex_calories, now.toFormat('yyyy-MM-dd HH:mm:ss'), id]
      );
    } else {
      await pool.query(
        'INSERT INTO rsp_move_data (id, user_id, calories_rsp, date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [
          Date.now(),
          userId,
          ex_calories,
          today.toFormat('yyyy-MM-dd HH:mm:ss'),
          now.toFormat('yyyy-MM-dd HH:mm:ss'),
          now.toFormat('yyyy-MM-dd HH:mm:ss'),
        ]
      );
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ burned: ex_calories, goal: goal_calories }),
    };
  } catch (err) {
    console.error('운동 종료 API 오류:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ detail: err.message }),
    };
  }
};
