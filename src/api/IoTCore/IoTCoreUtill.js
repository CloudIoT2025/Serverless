// ────────────────────────────────────────────────────────────────────────────
// IoTCoreUtill.js   (CommonJS 모듈)
// MQTT 연결 로직 + publish/subscribe 함수들
// ────────────────────────────────────────────────────────────────────────────

// 1) AWS IoT Device SDK v1 (CommonJS)
const awsIot = require("aws-iot-device-sdk");

// 2) AWS SDK for JavaScript v3 (IoT Data Plane) - 퍼블리시용
const {
  IoTDataPlaneClient,
  PublishCommand
} = require("@aws-sdk/client-iot-data-plane");

// 3) Node.js 내장 유틸 (payload 디코딩용)
const { TextDecoder } = require("util");

// 4) 환경 설정
const IOT_ENDPOINT           = "a1epz74jpvpof8-ats.iot.ap-northeast-2.amazonaws.com";
const AWS_REGION             = "ap-northeast-2";
const MOVE_START_TOPIC       = "move/start/";
const RESPONSE_MOVE_START_TOPIC = "response/move/start/";
const MOVE_END_TOPIC         = "move/end/";
const HEALTH_CHECK_TOPIC     = "clientCheckAlive/rsp/";
const TIMEOUT                = 3000;

// 5) IoT Data Plane Client (퍼블리시용)
const client = new IoTDataPlaneClient({
  region: AWS_REGION,
  endpoint: `https://${IOT_ENDPOINT}`,
});

/**
 * 6) MQTT 클라이언트 생성 함수 (v1 SDK 사용)
 *    - protocol: "wss" (WebSocket), IAM(Signing) 방식
 *    - Lambda 실행 역할에 IoT 권한(iot:Connect, iot:Subscribe, iot:Receive, iot:Publish)이 있어야 합니다.
 */
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

/**
 * 7) 운동 시작 메시지 발행 함수
 */
async function moveStart(rspId, num, url, userId) {
  return new Promise((resolve, reject) => {
    const clientId = `moveStart-${rspId}-${Date.now()}`;
    const client = createMqttClient(clientId);

    client.on("connect", () => {
      console.log(`▶ [moveStart] MQTT connected (clientId=${clientId})`);

      const topic = MOVE_START_TOPIC + rspId;
      const payload = `${num},${url},${userId}`;

      client.publish(topic, payload, { qos: 1 }, (err) => {
        if (err) {
          console.error("▶ [moveStart] Publish Error:", err);
          client.end(false, () => reject(err));
        } else {
          console.log("▶ [moveStart] Publish Success");
          console.log("   Topic:", topic);
          console.log("   Payload:", payload);
          client.end(false, () => resolve({ topic, payload }));
        }
      });
    });

    client.on("error", (err) => {
      console.error("▶ [moveStart] MQTT Error:", err);
      client.end(false, () => reject(err));
    });
  });
}

/**
 * 8) responseMoveStart: 구독 후 응답을 받아오는 함수
 */
async function responseMoveStart(rspId, timeout = TIMEOUT) {
  return new Promise((resolve) => {
    let timeoutHandle;
    const errResolve = '0'; // 에러 발생 시 반환 값
    // 1) 클라이언트 ID 생성
    const clientId = `Lambda-responseMoveStart-${rspId}-${Date.now()}`;
    // 2) MQTT 클라이언트 생성
    const client = createMqttClient(clientId);
    // 3) 구독할 토픽
    const topicToSubscribe = RESPONSE_MOVE_START_TOPIC + rspId; // e.g. "response/move/start/12345"

    // 4) MQTT 브로커에 연결되면 구독 시도
    client.on("connect", () => {
      console.log(`▶ [responseMoveStart] MQTT connected (clientId=${clientId})`);
      console.log(`▶ [responseMoveStart] Subscribing to "${topicToSubscribe}"`);

      client.subscribe(topicToSubscribe, { qos: 1 }, (err, granted) => {
        if (err) {
          console.error("▶ [responseMoveStart] Subscribe Error:", err);
          client.end(false, () => {
            // 구독 실패 시 0 반환
            resolve(errResolve);
          });
          return;
        }
        console.log(`[responseMoveStart] Subscribe granted:`, granted);

        // 5) 타임아웃 설정 (구독 성공 후)
        timeoutHandle = setTimeout(() => {
          console.warn(`[responseMoveStart] Timeout after ${timeout} ms, unsubscribing & disconnecting`);
          client.unsubscribe(topicToSubscribe, () => {
            client.end(false, () => {
              // 타임아웃도 실패이므로 0 반환
              resolve(errResolve);
            });
          });
        }, timeout);
      });
    });

    // 6) 메시지 수신 핸들러
    client.on("message", (topic, payloadBuffer) => {
      // (1) 타임아웃 해제
      clearTimeout(timeoutHandle);

      // (2) payloadBuffer(Uint8Array 또는 Buffer) → 문자열 디코딩
      const message = new TextDecoder("utf-8").decode(payloadBuffer);
      console.log(`[responseMoveStart] Received on "${topic}": ${message}`);

      // (3) 받은 메시지를 처리한 뒤, 동일 토픽에 빈 페이로드 + retain=true 로 publish하여
      //     브로커에 남아 있던 retained 메시지를 삭제
      client.publish(topicToSubscribe, "", { qos: 1, retain: true }, (pubErr) => {
        if (pubErr) {
          console.error("▶ [responseMoveStart] Clear retained Publish Error:", pubErr);
          // 삭제 실패해도 이후 로직은 동일
        } else {
          console.log(`▶ [responseMoveStart] Cleared retained on "${topicToSubscribe}"`);
        }

        // (4) 구독 해제 + 연결 종료
        client.unsubscribe(topicToSubscribe, () => {
          client.end(false, () => {
            // (5) 정상 성공: message 문자열 반환
            resolve(message);
          });
        });
      });
    });

    // 7) 에러 핸들링
    client.on("error", (err) => {
      console.error("▶ [responseMoveStart] MQTT Error:", err);
      clearTimeout(timeoutHandle);
      client.end(false, () => {
        // 에러 발생 시 0 반환
        resolve(errResolve);
      });
    });
  });
}


/**
 * 9) 운동 종료 메시지 구독 함수
 */
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


/**
 * 10) Health Check 메시지 구독 함수
 */
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

// 11) 외부에서 사용할 함수들을 모듈로 내보내기
module.exports = {
  moveStart,
  responseMoveStart,
  moveEnd,
  healthCheck
};
