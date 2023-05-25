import * as core from '@actions/core';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

function runContainerScript(imageName: string, scriptToExecute: string): string {
  // Write the script to a temporary file
  const tempFilePath = '/tmp/script.sh';
  writeFileSync(tempFilePath, scriptToExecute.toString());

  // Execute the script inside the container
  const command = `docker run --rm -v ${tempFilePath}:${tempFilePath} ${imageName} sh ${tempFilePath}`;
  const output = execSync(command).toString();

  return output;
}

async function run(): Promise<void> {
  try {
    const container = 'khasreto/o3de-extras-daily_dev';
    const o3deExtrasUrl = core.getInput('o3de-extras-url');
    const branchName = core.getInput('branch-name');
    const scriptPath = core.getInput('script-path');

    const setupScriptTemplate = `
      #!/bin/bash
      # Script to modify the container environment/setup
      
      # Change directory to o3de-extras
      cd o3de-extras
      
      # Set download_stream to the current URL
      git remote add download ${o3deExtrasUrl}
      
      # Pull the branch from which this CI is run
      git pull download
      git checkout/${branchName}
    `;
    
    const scriptToExecute = readFileSync(scriptPath, 'utf8');

    // Replace placeholders in the setup script template with actual values
    const setupScript = setupScriptTemplate.replace('<current URL>', o3deExtrasUrl).replace('<branch-name>', branchName);

    // Run the setup script to modify the container environment/setup
    const setupOutput = runContainerScript(container, setupScript);
    core.info('Setup script output:');
    core.info(setupOutput);

    // Run the main script on the modified container
    const mainOutput = runContainerScript(container, scriptToExecute);
    core.info('Main script output:');
    core.info(mainOutput);

    // Perform assertions on the output as needed
    if (mainOutput.includes('Expected output')) {
      core.info('Docker test passed!');
    } else {
      core.error('Docker test failed!');
      core.setFailed('Docker test failed!');
    }
  } catch (error) {
    if (error instanceof Error) {
      core.error(error.message);
      core.setFailed(error.message);
    }
  }
}

run();