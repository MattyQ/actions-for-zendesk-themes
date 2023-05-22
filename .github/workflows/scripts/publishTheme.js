const axios = require('axios');

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

instance.post(`/guide/theming/themes/${themeId}/publish`)
  .then((response) => {
    console.log(JSON.stringify(response.data));
    return JSON.stringify(response.data);
  })
  .catch((error) => {
    console.log(JSON.stringify(error));
    return new Error(JSON.stringify(error));
  });
