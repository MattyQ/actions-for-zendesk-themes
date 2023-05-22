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
    return {
      jobId: response.data.job.id,
      uploadUrl: response.data.job.data.upload.url,
      uploadParameters: response.data.job.data.upload.parameters
    };
  } catch (error) {
    console.error('Error starting theme update:', JSON.stringify(error, null, 2));
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
    console.log('Upload response:', response.data);
  } catch (error) {
    console.error('Error uploading theme file:', JSON.stringify(error, null, 2));
  }
}

async function checkUpdateJobStatus(jobId) {
  try {
    const response = await instance.get(`/guide/theming/jobs/${jobId}`);
    console.log('Job Status Response:', JSON.stringify(response.data, null, 2));
    return response.data.job;
  } catch (error) {
    console.error('Error checking job status:', JSON.stringify(error, null, 2));
  }
}

async function run() {
  const { jobId, uploadUrl, uploadParameters } = await updateTheme(themeId, replaceSettings);
  console.log('Job ID:', jobId);

  console.log('Uploading theme file...');
  await uploadThemeFile(uploadUrl, uploadParameters, filePath);
  console.log('Theme file uploaded.');

  let jobStatus = await checkUpdateJobStatus(jobId);
  while (jobStatus.status !== 'completed' && jobStatus.status !== 'failed') {
    console.log('Waiting for job to complete...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    jobStatus = await checkUpdateJobStatus(jobId);
  }

  if (jobStatus.status === 'failed') {
    console.log('Job failed:', JSON.stringify(jobStatus.errors, null, 2));
  } else if (jobStatus.status === 'completed') {
    console.log('Job completed. Theme updated.');
  } else {
    console.log('Job in unexpected state:', jobStatus.status);
  }
}

run();
