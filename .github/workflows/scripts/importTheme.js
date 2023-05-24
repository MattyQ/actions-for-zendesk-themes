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

const brandId = process.argv[2];
const filePath = process.argv[3];

if (!brandId || !filePath) {
  console.log('Please provide a brandId and a file path as arguments.');
  process.exit(1);
}

const MAX_WAIT_TIME = 5 * 60 * 1000; // 5 minutes

async function importTheme(brandId) {
  try {
    const response = await instance.post(`/guide/theming/jobs/themes/imports`, {
      job: {
        attributes: {
          brand_id: brandId,
          format: "zip"
        }
      }
    });
    console.log('::group::Import Theme Response');
    const prettyResponse = JSON.stringify(response.data, null, 2);
    console.log(prettyResponse);
    console.log('::endgroup::');

    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n\n## Import Theme Response\n\`\`\`json\n${prettyResponse}\n\`\`\``);

    return {
      jobId: response.data.job.id,
      uploadUrl: response.data.job.data.upload.url,
      uploadParameters: response.data.job.data.upload.parameters,
      themeId: response.data.job.data.theme_id
    };
  } catch (error) {
    console.log('::group::Action failed with error');
    const prettyError = JSON.stringify(error, null, 2);
    console.log(prettyError);
    console.log('::endgroup::');

    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n\n## Import Theme Error\n\`\`\`json\n${prettyError}\n\`\`\``);

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

async function checkImportJobStatus(jobId) {
  try {
    const response = await instance.get(`/guide/theming/jobs/${jobId}`);
    if (response.data.job.status !== 'pending') {
      console.log('::group::Import Job Response');
      const prettyResponse = JSON.stringify(response.data, null, 2);
      console.log(prettyResponse);
      console.log('::endgroup::');
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n\n## Import Job Response\n\`\`\`json\n${prettyResponse}\n\`\`\``);
    }
    return response.data.job;
  } catch (error) {
    console.log('::group::Action failed with error');
    const prettyError = JSON.stringify(error, null, 2);
    console.log(prettyError);
    console.log('::endgroup::');

    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n\n## Import Job Error\n\`\`\`json\n${prettyError}\n\`\`\``);

    process.exit(1);
  }
}

async function run() {
  const { jobId, uploadUrl, uploadParameters, themeId } = await importTheme(brandId);
  console.log('Job ID:', jobId);
  console.log('Theme ID:', themeId);

  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n\n## Import Job Theme ID\n\`\`\`json\nTheme ID: ${themeId}\n\`\`\``);

  console.log('Uploading theme file...');
  await uploadThemeFile(uploadUrl, uploadParameters, filePath);
  console.log('Theme file uploaded.');

  let jobStatus = await checkImportJobStatus(jobId);
  const startTime = Date.now();
  while (jobStatus.status !== 'completed' && jobStatus.status !== 'failed') {
    if (Date.now() - startTime > MAX_WAIT_TIME) {
      console.error('Job status check timed out');
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n\n## Job Status Check Timeout\nJob did not complete within ${MAX_WAIT_TIME / 1000} seconds`);
      process.exit(1);
    }
    console.log('Waiting for job to complete...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    jobStatus = await checkImportJobStatus(jobId);
  }

  if (jobStatus.status === 'failed') {
    console.error('Job failed:', JSON.stringify(jobStatus.errors, null, 2));
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n\n## Job Failed\n\`\`\`json\n${JSON.stringify(jobStatus.errors, null, 2)}\n\`\`\``);
    process.exit(1);
  } else if (jobStatus.status === 'completed') {
    console.log('Job completed. Theme imported.');
  } else {
    console.error('Job in unexpected state:', jobStatus.status);
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n\n## Unexpected Job State\n\`\`\`json\n${jobStatus.status}\n\`\`\``);
    process.exit(1);
  }
}

run();
