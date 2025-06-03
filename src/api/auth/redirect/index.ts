import { APIGatewayProxyHandler } from 'aws-lambda';
import axios, { AxiosError } from 'axios';
import { DateTime } from 'luxon';
import { Sequelize } from 'sequelize';
import { FitbitData } from './models/fitbit_data';
import { Users } from './models/users';

export const handler: APIGatewayProxyHandler = async event => {
  const { code, error, error_description } = event.queryStringParameters || {};
  if (error) {
    console.error('Fitbit 인증 에러:', error, error_description);
    return {
      statusCode: 400,
      body: `Fitbit 인증 에러: ${error}\n${error_description}`,
    };
  }
  if (!code) {
    console.log('인증 코드 없음');
    return {
      statusCode: 400,
      body: '인증 코드 없음',
    };
  }

  try {
    const tokenRes = await axios.post(
      'https://api.fitbit.com/oauth2/token',
      new URLSearchParams({
        client_id: process.env.FITBIT_CLIENT_ID as string,
        grant_type: 'authorization_code',
        redirect_uri: process.env.FITBIT_REDIRECT_URI as string,
        code: code,
      }),
      {
        headers: {
          Authorization:
            'Basic ' +
            Buffer.from(
              `${process.env.FITBIT_CLIENT_ID}:${process.env.FITBIT_CLIENT_SECRET}`,
            ).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    console.log('토큰 발급 응답:', tokenRes.data);
    const { access_token, refresh_token, user_id: encodedId } = tokenRes.data;

    const now = DateTime.now().setZone('Asia/Seoul');

    const sequelize = new Sequelize({
      dialect: 'mysql',
      host: process.env.DB_HOST,
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      logging: false,
    });
    const users = Users.initModel(sequelize);
    const fitbitData = FitbitData.initModel(sequelize);

    let user = await users.findOne({ where: { encodedId } });
    if (user) {
      await user.update({
        access_token,
        refresh_token,
        updated_at: now.toJSDate(),
      });
      console.log('기존 사용자 정보 업데이트:', user.id);
    } else {
      user = await users.create({
        id: now.valueOf(),
        encodedId,
        access_token,
        refresh_token,
        goal_calories: 2000,
      });
      console.log('신규 사용자 정보 저장:', user.id);
    }

    const { id: userId } = user;

    console.log('Fitbit 활동 데이터 요청:', now.toFormat('yyyy-MM-dd'));
    const activityRes = await axios.get(
      `https://api.fitbit.com/1/user/${encodedId}/activities/date/${now.toFormat(
        'yyyy-MM-dd',
      )}.json`,
      {
        headers: { Authorization: `Bearer ${access_token}` },
      },
    );
    const calories = activityRes.data.summary.caloriesOut;
    console.log('오늘의 칼로리 소모량:', calories);

    // 날짜마다 레코드가 하나씩 보장되도록 해야함.
    // 오늘자 fitbit_data 레코드 조회하기
    let fitbitDatum = await fitbitData.findOne({
      where: {
        user_id: userId,
        date: now.startOf('day').toJSDate(),
      },
    });

    if (fitbitDatum) {
      await fitbitDatum.update({
        calories_fitbit: calories,
        updated_at: now.toJSDate(),
      });
      console.log('기존 fitbit_data 레코드 업데이트:', fitbitDatum.id);
    } else {
      fitbitDatum = await fitbitData.create({
        id: `${encodedId}-${now.valueOf()}`,
        user_id: userId,
        encoded_id: encodedId,
        calories_fitbit: calories,
        date: now.startOf('day').toJSDate(),
        created_at: now.toJSDate(),
        updated_at: now.toJSDate(),
      });
      console.log('신규 fitbit_data 레코드 저장:', now.toFormat('yyyy-MM-dd'));
    }

    console.log(
      `✅ Fitbit 연동 성공 - 날짜: ${now.toFormat(
        'yyyy-MM-dd',
      )}, 칼로리: ${calories}, 사용자 ID: ${encodedId}`,
    );

    await sequelize.close();

    return {
      statusCode: 302,
      headers: {
        Location: `${process.env.FRONT_URL}/logincompleted?id=${userId}&access=${access_token}`,
      },
      body: '',
    };
  } catch (error) {
    console.error(error);
    if (error instanceof AxiosError) {
      console.error('Fitbit 인증/저장 중 오류:', error.response?.data);
    }
    return {
      statusCode: 500,
      body: 'Fitbit 인증/저장 중 오류',
    };
  }
};
