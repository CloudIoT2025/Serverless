const pool = require('./utils/db');
const {moveStart,responseMoveStart} = require('../../../IoTCoreUtill/IoTCoreUtill');

exports.handler = async (event) => {
  const userId = event.headers['x-user-id'];
  const exerciseId = event.pathParameters?.exerciseId;
  const rspId = event.queryStringParameters?.rspId;

  if (!userId || !exerciseId || !rspId) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'x-user-id 헤더, path의 exerciseId, query의 rspId가 모두 필요합니다.',
      }),
    };
  }

  console.log(`[운동 시작] Exercise ID: ${exerciseId}, Rsp ID: ${rspId}`);

  try {
    const [rows] = await pool.query(
      'SELECT id, s3url FROM s3_data WHERE video_id = ?',
      [exerciseId]
    );

    if (!rows.length) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: '해당 exerciseId에 대한 데이터가 없습니다.' }),
      };
    }

    const s3DataId = rows[0].id;
    const s3DataUrl = rows[0].s3url;

    const mqttResponsePromise = responseMoveStart(rspId, 10000); // 10초 타임아웃 설정
    await moveStart(rspId, s3DataId, s3DataUrl, userId);

    const message = await mqttResponsePromise;
    console.log(`/response/move/start/${rspId}: ${message}`);
    const valid = message.trim() === '1';

    if (valid) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: '운동이 시작되었습니다.', exerciseId }),
      };
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: '다른 운동 중 등의 이유로 현재 운동을 시작할 수 없습니다',
        }),
      };
    }
  } catch (err) {
    console.error('운동 시작 중 오류:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ detail: err.message }),
    };
  }
};
