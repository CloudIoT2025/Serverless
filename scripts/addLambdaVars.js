import dotenv from 'dotenv';
import {
  LambdaClient,
  UpdateFunctionConfigurationCommand,
} from '@aws-sdk/client-lambda';
import { fromIni } from '@aws-sdk/credential-providers';

// argv[0] = runtime
// argv[1] = filename

dotenv.config({ path: `.env` });

const lambdaFunctionNames = [
  'movemore-serverless-hello',
  'fitbit-redirect-callback',
];

const client = new LambdaClient({
  region: 'ap-northeast-2',
  credentials: fromIni({ profile: 'movemore' }),
});

lambdaFunctionNames.forEach(async functionName => {
  const command = new UpdateFunctionConfigurationCommand({
    FunctionName: functionName,
    Environment: {
      Variables: {
        DB_HOST: process.env.DB_HOST,
        DB_NAME: process.env.DB_NAME,
        DB_PASSWORD: process.env.DB_PASSWORD,
        DB_USER: process.env.DB_USER,
        FITBIT_CLIENT_ID: process.env.FITBIT_CLIENT_ID,
        FITBIT_CLIENT_SECRET: process.env.FITBIT_CLIENT_SECRET,
        FITBIT_REDIRECT_URI: process.env.FITBIT_REDIRECT_URI,
        FITBIT_SCOPE: process.env.FITBIT_SCOPE,
        FRONT_URL: process.env.FRONT_URL,
      },
    },
  });

  const { FunctionArn } = await client.send(command);
  console.log(FunctionArn);
});
