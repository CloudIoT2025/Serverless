const {healthCheck} = require('../../../IoTCoreUtill/IoTCoreUtill');


exports.handler = async (event) => {
  try {
    const { code } = JSON.parse(event.body);

    if (!code) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing code in request body' }),
      };
    }

    const result = healthCheck(code, 5000); // 5초 타임아웃 설정
    const message = await result;
    const valid = message === '1';
    return {
      statusCode: 200,
      body: JSON.stringify({ valid, rspId: code }),
    };

  } catch (error) {
    console.error('라즈베리 코드 확인 오류:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: '서버 오류' }),
    };
  }
};
