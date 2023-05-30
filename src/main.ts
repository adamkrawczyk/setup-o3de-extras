import * as core from '@actions/core';
import { execSync } from 'child_process';
import { readFile, writeFileSync, rmdir } from 'fs';

function runContainerScript(imageName: string, scriptToExecute: string): string {
  // Write the script to a temporary file
  const tempFilePath = '/tmp/ci_testing/';
  const tempFileName = 'script.sh';
  const tempFileFullPath = `${tempFilePath}${tempFileName}`;

  // try to remove the file asynchronously
  rmdir(tempFilePath, { recursive: true }, (err) => {
    if (err) {
      throw err;
    }
  });

  // Write file to the temp file and check if it is written correctly
  try {
    writeFileSync(tempFileFullPath, scriptToExecute.toString());
  } catch (error) {
    core.error(`Failed to write to file: ${tempFileFullPath}`);
    core.setFailed(`Failed to write to file: ${tempFileFullPath}`);
  }

  // Execute the script inside the container

  // Check if the repo is o3de-extras

  const repoName = execSync(`pwd`).toString();
  // debug print the repo name
  console.log(`repoName: ${repoName}`);
  const folderName = repoName.split('/').pop();
  console.log(`folderName: ${folderName}`);
  

  // declare the command
  let command = '';

  if (repoName.includes('o3de-extras')) {
    // if it is o3de-extras, then we need to mount the workspace
    command = `docker run --rm -v ${tempFileFullPath}:${tempFileFullPath} -v $(pwd)/../o3de-extras:/data/workspace/o3de-extras ${imageName} /bin/bash ${tempFileFullPath}`;
  }
  else {
    command = `docker run --rm -v ${tempFileFullPath}:${tempFileFullPath} -v $(pwd)/../${folderName}:/data/workspace/repository ${imageName} /bin/bash ${tempFileFullPath}`;
  }

  const output = execSync(command).toString();

  return output;
}

async function run(): Promise<void> {
  try {
    const container = core.getInput('container');
    const scriptPath = core.getInput('script-path');

    const scriptToExecute = await new Promise<string>((resolve, reject) => {
      readFile(scriptPath, 'utf8', (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });

    // Run the main script on the modified container
    const mainOutput = runContainerScript(container, scriptToExecute);
    core.info('Main script output:');
    core.info(mainOutput);

    // Perform assertions on the output as needed
    if (mainOutput.includes('RESULT: ALL TESTS PASSED')) {
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