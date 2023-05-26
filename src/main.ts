import * as core from '@actions/core';
import { execSync } from 'child_process';
import { readFile } from 'fs';
import { readFileSync, writeFileSync } from 'fs';

function runContainerScript(imageName: string, scriptToExecute: string): string {
  // Write the script to a temporary file
  const tempFilePath = '/tmp/o3de-extras-test-script.sh';
  // try to remove the file if it exists
  try {
    execSync(`rm ${tempFilePath}`);
  } catch (error) {
    // do nothing
  }

  writeFileSync(tempFilePath, scriptToExecute.toString());

  // Execute the script inside the container
  const command = `docker run --rm -v ${tempFilePath}:${tempFilePath} -v $(pwd)/o3de-extras:/o3de-extras ${imageName} sh ${tempFilePath}`;
  const output = execSync(command).toString();

  return output;
}

async function run(): Promise<void> {
  try {
    const container = 'khasreto/o3de-extras-daily_dev';
    const o3deExtrasUrl = core.getInput('o3de-extras-url');
    const branchName = core.getInput('branch-name');
    const scriptPath = core.getInput('script-path');

    const currentO3deSha = execSync('git rev-parse HEAD').toString();

    const setupScriptTemplate = `
      #!/bin/bash
      # Script to modify the container environment/setup
      rm -rf /o3de-extras
      `;
    
    const scriptToExecute = await new Promise<string>((resolve, reject) => {
      readFile(scriptPath, 'utf8', (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });


    // Replace placeholders in the setup script template with actual values
    const setupScript = setupScriptTemplate.replace('<current URL>', o3deExtrasUrl).replace('<version>', currentO3deSha);

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