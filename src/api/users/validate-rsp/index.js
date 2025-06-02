const { waitForMqttMessage, sendMqttMessage } = require('../../../mqtt/mqttHandler');

exports.handler = async (event) => {
  try {
    const { code } = JSON.parse(event.body);

    if (!code) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing code in request body' }),
      };
    }

    // 메시지 수신 기다리는 Promise
    const result = waitForMqttMessage(`response/clientCheck/${code}`);
    // MQTT로 코드 전송
    sendMqttMessage('clientCheck/rsp', code);

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
