const axios = require('axios');
const fs = require('fs');

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
    return { jobId: response.data.job.id, url: response.data.job.data.download.url };
  } catch (error) {
    console.error('Error exporting theme:', JSON.stringify(error, null, 2));
  }
}

async function checkExportJobStatus(jobId) {
  try {
    const response = await instance.get(`/guide/theming/jobs/${jobId}`);
    console.log('Job Status Response:', JSON.stringify(response.data, null, 2));
    return response.data.job;
  } catch (error) {
    console.error('Error checking job status:', JSON.stringify(error, null, 2));
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
      writer.on('error', reject);
    });
  } catch (error) {
    console.error('Error downloading theme file:', JSON.stringify(error, null, 2));
  }
}

async function run() {
  const { jobId, url } = await exportTheme(themeId);
  console.log('Job ID:', jobId);

  let jobStatus = await checkExportJobStatus(jobId);
  while (jobStatus.status !== 'completed' && jobStatus.status !== 'failed') {
    console.log('Waiting for job to complete...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    jobStatus = await checkExportJobStatus(jobId);
  }

  if (jobStatus.status === 'failed') {
    console.log('Job failed:', JSON.stringify(jobStatus.errors, null, 2));
  } else if (jobStatus.status === 'completed') {
    console.log('Job completed. Downloading theme file...');
    await downloadThemeFile(url, `./theme_${themeId}.zip`);
    console.log('Theme file downloaded.');
  } else {
    console.log('Job in unexpected state:', jobStatus.status);
  }
}

run();
