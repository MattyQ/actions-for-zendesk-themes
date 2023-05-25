# GitHub Actions for Zendesk Themes API

This repository implements GitHub Actions for each of the [Zendesk Themes API](https://developer.zendesk.com/api-reference/help_center/help-center-api/theming/) operations:
 
- List Themes
- Show Theme
- Publish Theme
- Delete Theme
- Import Theme
- Export Theme
- Update Theme

## Set up the actions

This section assumes you want to set up a fresh GitHub repository for your Zendesk themes.

1. [Fork the repository](https://docs.github.com/en/get-started/quickstart/fork-a-repo).
2. Create the following [repository secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets#creating-encrypted-secrets-for-a-repository):
  - `ZENDESK_SUBDOMAIN`: The subdomain for your Zendesk Help Center. For example, if your Help Center URL is https://example-subdomain.zendesk.com/, you set the secret to `example-subdomain`.
  - `ZENDESK_EMAIL`: The email for the account that you want to use to [authenticate](https://developer.zendesk.com/api-reference/introduction/security-and-auth/#api-token). Because the actions use a Zendesk token, add the literal string `/token` to the email address: `jdoe@example.com/token`
  - `ZENDESK_TOKEN`: The Zendesk token that you want to use to authenticate. See the [Zendesk documentation](https://support.zendesk.com/hc/en-us/articles/4408889192858-Generating-a-new-API-token) for instructions about generating a token. For example: `6wiIBWbGkBMo1mRDMuVwkw1EPsNkeUj95PIz2akv`
3. If the default or root branch of your repository is not named `main`, go through the .yml files in `.github/workflows` and change the `on.workflow_dispatch.inputs.scriptBranch.default` value to the name of your default branch.

If you want to add the GitHub Actions to an existing repository of Zendesk themes, copy the entire `.github/workflows` directory and add it to the root of each of your existing branches.

## Use the actions

This section assumes you are familiar with [running a workflow](https://docs.github.com/en/actions/managing-workflow-runs/manually-running-a-workflow#running-a-workflow) on GitHub. The GitHub Actions for Zendesk Themes are all implemented to be manually run.

All of the actions include a `Run scripts from` value. By default, the actions are designed to use the main branch of your repository. For development purposes, if you make changes to an action's JavaScript in a specific branch, you can specify that branch in `Run scripts from` to use that version of the action.

To use each of the actions, follow these common steps:

1. On the left side of the **Actions** page of your GitHub repository, select the GitHub Action you want to run.
2. On the right side of the **Actions** page, select **Run workflow**.

The actions are listed loosely in order of how they might be commonly used.

### List themes

This action has no required inputs.

The workflow summary provides a pretty-printed version of the JSON response, where you can view and copy theme data, such as theme IDs.

### Show theme

This action requires a theme ID.

The workflow summary provides a pretty-printed version of the JSON response, which shows specific information about the theme. This is the same data contained in the response when you list themes.

### Export theme

This action requires a theme ID.

The workflow summary provides a zip file that contains the exported theme. The summary also contains the responses from Zendesk API.

### Import theme

This action requires a brand ID and branch name.

This action assumes that a given branch (the branch name) stores the contents of your theme. Typically, this means things such as your theme's `manifest.json` are stored in the root of the branch. Functionally, after you export a theme, you copy the contents of the export zip file to a new branch.

The action creates a zip file of branch contents (hidden files are excluded, such as the action files), and then uploads that zip file to URL provided by the Zendesk API.

The workflow summary provides a zip file that contains the import theme. The summary also contains the theme ID and responses from Zendesk API.

### Update theme

This action requires a theme ID and branch name. For the operation to succeed, you must also increase the version number in your theme's `manifest.json`.

This action assumes that a given branch (the branch name) stores the contents of your theme. Typically, this means things such as your theme's `manifest.json` are stored in the root of the branch. Functionally, after you export a theme, you copy the contents of the export zip file to a new branch.

The action creates a zip file of branch contents (hidden files are excluded, such as the action files), and then uploads that zip file to URL provided by the Zendesk API.

The workflow summary provides a zip file that contains the updated theme. The summary also contains the responses from Zendesk API.

### Publish theme

This action requires a theme ID.

The workflow summary indicates if the theme was successfully published.

### Delete theme

This action requires a theme ID.

The workflow summary indicates if the theme was successfully deleted.
