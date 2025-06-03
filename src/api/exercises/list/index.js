exports.handler = async (event) => {
  try {
    const videos = [
      { videoId: 'W-L_V7S5Zq8', title: '저강도 운동', goal: 200, duration: 1200 },
      { videoId: 'HK5VQq836Tw', title: '중강도 운동', goal: 300, duration: 1300 },
      { videoId: 'iD0L3TR8Uh8', title: '고강도 운동', goal: 500, duration: 1500 },
    ];

    return {
      statusCode: 200,
      body: JSON.stringify(videos),
    };
  } catch (err) {
    console.error('운동 목록 조회 오류:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
