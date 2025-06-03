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

// Health Check 메시지 구독 함수
async function healthCheck(rspId, timeout = 3000) {
  return new Promise((resolve) => {
    let timeoutHandle;
    const errResolve = '0'; // 에러 발생 시 반환 값
    const clientId = `Lambda-healthCheck-${rspId}-${Date.now()}`;
    const client = createMqttClient(clientId);
    const topicToSubscribe = HEALTH_CHECK_TOPIC + rspId; // 예: "clientCheckAlive/rsp/12345"

    client.on("connect", () => {
      console.log(`▶ [healthCheck] MQTT connected (clientId=${clientId})`);
      console.log(`▶ [healthCheck] Subscribing to "${topicToSubscribe}"`);

      client.subscribe(topicToSubscribe, { qos: 1 }, (err, granted) => {
        if (err) {
          console.error("▶ [healthCheck] Subscribe Error:", err);
          client.end(false, () => {
            // 구독 실패도 실패 케이스이므로 0 반환
            resolve(errResolve);
          });
          return;
        }
        console.log(`[healthCheck] Subscribe granted:`, granted);

        // 타임아웃 설정 (구독 성공 후)
        timeoutHandle = setTimeout(() => {
          console.warn(`[healthCheck] Timeout after ${timeout} ms, unsubscribing & disconnecting`);
          client.unsubscribe(topicToSubscribe, () => {
            client.end(false, () => {
              // 타임아웃도 실패이므로 0 반환
              resolve(errResolve);
            });
          });
        }, timeout);
      });
    });

    client.on("message", (topic, payloadBuffer) => {
      clearTimeout(timeoutHandle);

      // (성공 케이스) 메시지를 제대로 받았으므로 1 반환
      client.unsubscribe(topicToSubscribe, () => {
        client.end(false, () => {
          resolve('1');
        });
      });
    });

    client.on("error", (err) => {
      console.error("▶ [healthCheck] MQTT Error:", err);
      clearTimeout(timeoutHandle);
      client.end(false, () => {
        // 에러도 실패이므로 0 반환
        resolve(errResolve);
      });
    });
  });
}

// 외부에서 사용할 함수들을 모듈로 내보내기
module.exports = {
  healthCheck
};
