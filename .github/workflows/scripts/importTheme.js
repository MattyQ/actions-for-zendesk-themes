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
    return {
      jobId: response.data.job.id,
      uploadUrl: response.data.job.data.upload.url,
      uploadParameters: response.data.job.data.upload.parameters,
      themeId: response.data.job.data.theme_id
    };
  } catch (error) {
    console.error('Error starting theme import:', JSON.stringify(error, null, 2));
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

async function checkImportJobStatus(jobId) {
  try {
    const response = await instance.get(`/guide/theming/jobs/${jobId}`);
    console.log('Job Status Response:', JSON.stringify(response.data, null, 2));
    return response.data.job;
  } catch (error) {
    console.error('Error checking job status:', JSON.stringify(error, null, 2));
  }
}

async function run() {
  const { jobId, uploadUrl, uploadParameters, themeId } = await importTheme(brandId);
  console.log('Job ID:', jobId);
  console.log('Theme ID:', themeId);

  console.log('Uploading theme file...');
  await uploadThemeFile(uploadUrl, uploadParameters, filePath);
  console.log('Theme file uploaded.');

  let jobStatus = await checkImportJobStatus(jobId);
  while (jobStatus.status !== 'completed' && jobStatus.status !== 'failed') {
    console.log('Waiting for job to complete...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    jobStatus = await checkImportJobStatus(jobId);
  }

  if (jobStatus.status === 'failed') {
    console.log('Job failed:', JSON.stringify(jobStatus.errors, null, 2));
  } else if (jobStatus.status === 'completed') {
    console.log('Job completed. Theme imported.');
  } else {
    console.log('Job in unexpected state:', jobStatus.status);
  }
}

run();
