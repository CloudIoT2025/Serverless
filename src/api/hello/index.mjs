export const handler = async event => {
  return {
    statusCode: 200,
    body: JSON.stringify(event),
    headers: {
      'Content-Type': 'application/json',
    },
  };
};
