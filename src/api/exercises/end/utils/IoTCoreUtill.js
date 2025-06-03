// AWS IoT Device SDK v1 (CommonJS)
const awsIot = require("aws-iot-device-sdk");

// AWS SDK for JavaScript v3 (IoT Data Plane) - 퍼블리시용
const {
  IoTDataPlaneClient,
  PublishCommand
} = require("@aws-sdk/client-iot-data-plane");

// Node.js 내장 유틸 (payload 디코딩용)
const { TextDecoder } = require("util");

// 환경 설정
const IOT_ENDPOINT           = "a1epz74jpvpof8-ats.iot.ap-northeast-2.amazonaws.com";
const AWS_REGION             = "ap-northeast-2";
const MOVE_START_TOPIC       = "move/start/";
const RESPONSE_MOVE_START_TOPIC = "response/move/start/";
const MOVE_END_TOPIC         = "move/end/";
const HEALTH_CHECK_TOPIC     = "clientCheckAlive/rsp/";
const TIMEOUT                = 3000;

// IoT Data Plane Client (퍼블리시용)
const client = new IoTDataPlaneClient({
  region: AWS_REGION,
  endpoint: `https://${IOT_ENDPOINT}`,
});


// MQTT 클라이언트 생성 함수 (v1 SDK 사용)
function createMqttClient(clientId) {
  return awsIot.device({
    protocol: "wss",
    host: IOT_ENDPOINT,
    region: AWS_REGION,
    clientId,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN, // 임시 자격증명 시 필요
    reconnectPeriod: 1000,
    keepalive: 30,
    clean: true,
  });
}


// 운동 종료 메시지 구독 함수
async function moveEnd(rspId, timeout = 3000) {
  return new Promise((resolve) => {
    let timeoutHandle;
    const errResolve = '0.0,None'; // 에러 발생 시 반환 값

    const clientId = `Lambda-moveEnd-${rspId}-${Date.now()}`;
    const client = createMqttClient(clientId);
    const topicToSubscribe = MOVE_END_TOPIC + rspId; // e.g. "move/end/12345"

    client.on("connect", () => {
      console.log(`▶ [moveEnd] MQTT connected (clientId=${clientId})`);
      console.log(`▶ [moveEnd] Subscribing to "${topicToSubscribe}"`);

      client.subscribe(topicToSubscribe, { qos: 1 }, (err, granted) => {
        if (err) {
          console.error("▶ [moveEnd] Subscribe Error:", err);
          client.end(false, () => {
            // 구독 실패 시 "0.0,None" 반환
            resolve(errResolve);
          });
          return;
        }
        console.log(`[moveEnd] Subscribe granted:`, granted);

        timeoutHandle = setTimeout(() => {
          console.warn(`[moveEnd] Timeout after ${timeout} ms, unsubscribing & disconnecting`);
          client.unsubscribe(topicToSubscribe, () => {
            client.end(false, () => {
              // 타임아웃 시 "0.0,None" 반환
              resolve(errResolve);
            });
          });
        }, timeout);
      });
    });

    client.on("message", (topic, payloadBuffer) => {
      clearTimeout(timeoutHandle);

      const message = new TextDecoder("utf-8").decode(payloadBuffer);
      console.log(`[moveEnd] Received on "${topic}": ${message}`);

      client.publish(topicToSubscribe, "", { qos: 0, retain: true }, (pubErr) => {
        if (pubErr) {
          console.error("▶ [moveEnd] Clear retained Publish Error:", pubErr);
        } else {
          console.log(`▶ [moveEnd] Cleared retained on "${topicToSubscribe}"`);
        }

        client.unsubscribe(topicToSubscribe, () => {
          client.end(false, () => {
            // 정상 수신 시 페이로드 문자열 반환
            resolve(message);
          });
        });
      });
    });

    client.on("error", (err) => {
      console.error("▶ [moveEnd] MQTT Error:", err);
      clearTimeout(timeoutHandle);
      client.end(false, () => {
        // 에러 발생 시 "0.0,None" 반환
        resolve(errResolve);
      });
    });
  });
}

// 외부에서 사용할 함수들을 모듈로 내보내기
module.exports = {
  moveEnd
};
