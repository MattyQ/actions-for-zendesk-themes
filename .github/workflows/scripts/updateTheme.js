const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

const instance = axios.create({
  baseURL: `https://${process.env['ZENDESK_SUBDOMAIN']}.zendesk.com/api/v2`,
  auth: {
    username: process.env['ZENDESK_EMAIL'],
    password: process.env['ZENDESK_TOKEN']
  }
});

const themeId = process.argv[2];
const filePath = process.argv[3];
const replaceSettings = process.argv[4] === 'true';

if (!themeId || !filePath) {
  console.log('Please provide a themeId, a file path, and a replace settings flag as arguments.');
  process.exit(1);
}

const MAX_WAIT_TIME = 5 * 60 * 1000;

async function updateTheme(themeId, replaceSettings) {
  try {
    const response = await instance.post(`/guide/theming/jobs/themes/updates`, {
      job: {
        attributes: {
          theme_id: themeId,
          replace_settings: replaceSettings,
          format: "zip"
        }
      }
    });
    console.log('::group::Update Theme Response');
    const prettyResponse = JSON.stringify(response.data, null, 2);
    console.log(prettyResponse);
    console.log('::endgroup::');

    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n\n## Update Theme Response\n\`\`\`json\n${prettyResponse}\n\`\`\``);

    return {
      jobId: response.data.job.id,
      uploadUrl: response.data.job.data.upload.url,
      uploadParameters: response.data.job.data.upload.parameters
    };
  } catch (error) {
    console.log('::group::Action failed with error');
    const prettyError = JSON.stringify(error, null, 2);
    console.log(prettyError);
    console.log('::endgroup::');

    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n\n## Update Theme Error\n\`\`\`json\n${prettyError}\n\`\`\``);

    process.exit(1);
  }
}

async function uploadThemeFile(uploadUrl, uploadParameters, filePath) {
  const form = new FormData();

  for (const key in uploadParameters) {
    form.append(key, uploadParameters[key]);
  }

  let readStream;
  try {
    readStream = fs.createReadStream(filePath);
  } catch (error) {
    console.error('Error reading file:', error);
    process.exit(1);
  }
  form.append('file', readStream);

  try {
    const response = await axios.post(uploadUrl, form, { headers: form.getHeaders() });
    console.log('::group::Upload Theme File Response');
    const prettyResponse = JSON.stringify(response.data, null, 2);
    console.log(prettyResponse);
    console.log('::endgroup::');

    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n\n## Upload Theme File Response\n\`\`\`json\n${prettyResponse}\n\`\`\``);
  } catch (error) {
    console.log('::group::Action failed with error');
    const prettyError = JSON.stringify(error, null, 2);
    console.log(prettyError);
    console.log('::endgroup::');

    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n\n## Upload Theme File Error\n\`\`\`json\n${prettyError}\n\`\`\``);

    process.exit(1);
  }
}

async function checkUpdateJobStatus(jobId) {
  try {
    const response = await instance.get(`/guide/theming/jobs/${jobId}`);
    if (response.data.job.status !== 'pending') {
      console.log('::group::Check Update Job Status Response');
      const prettyResponse = JSON.stringify(response.data, null, 2);
      console.log(prettyResponse);
      console.log('::endgroup::');
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n\n## Check Update Job Status Response\n\`\`\`json\n${prettyResponse}\n\`\`\``);
    }
    return response.data.job;
  } catch (error) {
    console.log('::group::Action failed with error');
    const prettyError = JSON.stringify(error, null, 2);
    console.log(prettyError);
    console.log('::endgroup::');

    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n\n## Check Update Job Status Error\n\`\`\`json\n${prettyError}\n\`\`\``);

    process.exit(1);
  }
}

async function run() {
  const { jobId, uploadUrl, uploadParameters } = await updateTheme(themeId, replaceSettings);
  console.log('Job ID:', jobId);

  console.log('Uploading theme file...');
  await uploadThemeFile(uploadUrl, uploadParameters, filePath);
  console.log('Theme file uploaded.');

  let jobStatus = await checkUpdateJobStatus(jobId);
  const startTime = Date.now();
  while (jobStatus.status !== 'completed' && jobStatus.status !== 'failed') {
    if (Date.now() - startTime > MAX_WAIT_TIME) {
      console.error('Job status check timed out');
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n\n## Job Status Check Timeout\nJob did not complete within ${MAX_WAIT_TIME / 1000} seconds`);
      process.exit(1);
    }
    console.log('Waiting for job to complete...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    jobStatus = await checkUpdateJobStatus(jobId);
  }

  if (jobStatus.status === 'failed') {
    console.error('Job failed:', JSON.stringify(jobStatus.errors, null, 2));
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n\n## Job Failed\n\`\`\`json\n${JSON.stringify(jobStatus.errors, null, 2)}\n\`\`\``);
    process.exit(1);
  } else if (jobStatus.status === 'completed') {
    console.log('Job completed. Theme updated.');
  } else {
    console.error('Job in unexpected state:', jobStatus.status);
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n\n## Unexpected Job State\n\`\`\`json\n${jobStatus.status}\n\`\`\``);
    process.exit(1);
  }
}

run();
