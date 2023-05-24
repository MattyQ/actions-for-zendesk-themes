const axios = require('axios');
const fs = require('fs');
const os = require('os');

const instance = axios.create({
  baseURL: `https://${process.env['ZENDESK_SUBDOMAIN']}.zendesk.com/api/v2`,
  auth: {
    username: process.env['ZENDESK_EMAIL'],
    password: process.env['ZENDESK_TOKEN']
  }
});

instance.get('/guide/theming/themes')
  .then((response) => {
    console.log('::group::Theme Response');
    const prettyResponse = JSON.stringify(response.data, null, 2);
    console.log(prettyResponse);
    console.log('::endgroup::');

    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n\n## List Themes Response\n\`\`\`json\n${prettyResponse}\n\`\`\``);
  })
  .catch((error) => {
    console.log('::group::Action failed with error');
    const prettyError = JSON.stringify(error, null, 2);
    console.log(prettyError);
    console.log('::endgroup::');
  
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n\n## List Themes Error\n\`\`\`json\n${prettyError}\n\`\`\``);

    process.exit(1);
  });
