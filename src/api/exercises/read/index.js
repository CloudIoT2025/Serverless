exports.handler = async (event) => {
  const exerciseId = event.pathParameters?.exerciseId;

  if (!exerciseId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'exerciseId 경로 파라미터가 필요합니다.' }),
    };
  }

  try {
    const videos = [
      { videoId: 'W-L_V7S5Zq8', title: '저강도 운동', goal: 200, duration: 1200 },
      { videoId: 'HK5VQq836Tw', title: '중강도 운동', goal: 300, duration: 1300 },
      { videoId: 'iD0L3TR8Uh8', title: '고강도 운동', goal: 500, duration: 1500 },
    ];

    const video = videos.find((v) => v.videoId === exerciseId);

    if (!video) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: '해당 exerciseId의 운동을 찾을 수 없습니다.' }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(video),
    };
  } catch (err) {
    console.error('운동 상세 조회 오류:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
