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

if (!themeId) {
  console.log('Please provide a themeId as an argument.');
  process.exit(1);
}

const MAX_WAIT_TIME = 5 * 60 * 1000; // 5 minutes

async function exportTheme(themeId) {
  try {
    const response = await instance.post(`/guide/theming/jobs/themes/exports`, {
      job: {
        attributes: {
          theme_id: themeId,
          format: "zip"
        }
      }
    });
    console.log('::group::Export Theme Response');
    const prettyResponse = JSON.stringify(response.data, null, 2);
    console.log(prettyResponse);
    console.log('::endgroup::');

    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n\n## Export Theme Response\n\`\`\`json\n${prettyResponse}\n\`\`\``);

    return { jobId: response.data.job.id, url: response.data.job.data.download.url };
  } catch (error) {
    console.log('::group::Action failed with error');
    const prettyError = JSON.stringify(error, null, 2);
    console.log(prettyError);
    console.log('::endgroup::');

    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n\n## Export Theme Error\n\`\`\`json\n${prettyError}\n\`\`\``);

    process.exit(1);
  }
}

async function checkExportJobStatus(jobId) {
  try {
    const response = await instance.get(`/guide/theming/jobs/${jobId}`);
    if (response.data.job.status !== 'pending') {
      console.log('::group::Export Job Status Response');
      const prettyResponse = JSON.stringify(response.data, null, 2);
      console.log(prettyResponse);
      console.log('::endgroup::');
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n\n## Export Job Status Response\n\`\`\`json\n${prettyResponse}\n\`\`\``);
    }
    return response.data.job;
  } catch (error) {
    console.log('::group::Action failed with error');
    const prettyError = JSON.stringify(error, null, 2);
    console.log(prettyError);
    console.log('::endgroup::');

    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n\n## Export Job Status Error\n\`\`\`json\n${prettyError}\n\`\`\``);

    process.exit(1);
  }
}

async function downloadThemeFile(url, filePath) {
  const writer = fs.createWriteStream(filePath);

  try {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream'
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', error => {
        console.log('::group::Action failed with error');
        const prettyError = JSON.stringify(error, null, 2);
        console.log(prettyError);
        console.log('::endgroup::');
        fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n\n## Download Theme File Error\n\`\`\`json\n${prettyError}\n\`\`\``);
        reject(error);
      });
    });
  } catch (error) {
    console.log('::group::Action failed with error');
    const prettyError = JSON.stringify(error, null, 2);
    console.log(prettyError);
    console.log('::endgroup::');

    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n\n## Download Theme File Error\n\`\`\`json\n${prettyError}\n\`\`\``);

    process.exit(1);
  }
}

async function run() {
  const { jobId, url } = await exportTheme(themeId);
  console.log('Job ID:', jobId);

  let jobStatus = await checkExportJobStatus(jobId);
  const startTime = Date.now();
  while (jobStatus.status !== 'completed' && jobStatus.status !== 'failed') {
    if (Date.now() - startTime > MAX_WAIT_TIME) {
      console.error('Job status check timed out');
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n\n## Job Status Check Timeout\nJob did not complete within ${MAX_WAIT_TIME / 1000} seconds`);
      process.exit(1);
    }
    console.log('Waiting for job to complete...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    jobStatus = await checkExportJobStatus(jobId);
  }

  if (jobStatus.status === 'failed') {
    console.error('Job failed:', JSON.stringify(jobStatus.errors, null, 2));
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n\n## Job Failed\n\`\`\`json\n${JSON.stringify(jobStatus.errors, null, 2)}\n\`\`\``);
    process.exit(1);
  } else if (jobStatus.status === 'completed') {
    console.log('Job completed. Downloading theme file...');
    await downloadThemeFile(url, `./theme_${themeId}.zip`);
    console.log('Theme file downloaded.');
  } else {
    console.error('Job in unexpected state:', jobStatus.status);
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n\n## Unexpected Job State\n\`\`\`json\n${jobStatus.status}\n\`\`\``);
    process.exit(1);
  }
}

run();
