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

instance.get(`/guide/theming/themes/${themeId}`)
  .then((response) => {
    console.log('::group::Theme Response');
    const prettyResponse = JSON.stringify(response.data, null, 2);
    console.log(prettyResponse);
    console.log('::endgroup::');

    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n\n## Show Theme Response\n\`\`\`json\n${prettyResponse}\n\`\`\``);
  })
  .catch((error) => {
    console.log('::group::Action failed with error');
    const prettyError = JSON.stringify(error, null, 2);
    console.log(prettyError);
    console.log('::endgroup::');

    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n\n## Show Theme Error\n\`\`\`json\n${prettyError}\n\`\`\``);

    process.exit(1);
  });
