import * as core from '@actions/core';
import { execSync } from 'child_process';
import { readFile, writeFile, rm, mkdir } from 'fs';
import {expect, test} from '@jest/globals'

function runContainerScript(imageName: string, scriptToExecute: string): string {
  // Write the script to a temporary file
  const tempFilePath = '/tmp/ci_testing/';
  const tempFileName = 'script.sh';
  const tempFileFullPath = tempFilePath + tempFileName;

  // try to remove the file asynchronously
  rm(tempFilePath, { recursive: true }, (err) => {
    if (err) {
      // do nothing
    }

    // create the directory
    mkdir(tempFilePath, { recursive: true }, (err) => {
      if (err) {
        console.error(`Failed to create directory: ${tempFilePath}`);
        throw err;
      }

      // write the file to the temp file
      writeFile(tempFileFullPath, scriptToExecute.toString(), (err) => {
        if (err) {
          console.error(`Failed to write to file: ${tempFileFullPath}`);
          throw err;
        }
        console.log(`File written successfully: ${tempFileFullPath}`);
      });
    });
  });

  // Execute the script inside the container

  // Check if the repo is o3de-extras

  const repoName = execSync(`pwd`).toString();
  // debug print the repo name
  console.log(`repoName: ${repoName}`);
  const folderName = repoName.split('/').pop()?.replace('\n', '');

  console.log(`folderName: ${folderName}`);

  // declare the command
  let command = '';

  if (folderName === 'o3de-extras') {
    console.log('o3de-extras detected');
    // if it is o3de-extras, then we need to mount the workspace
    command = `docker run --rm -v ${tempFileFullPath}:${tempFileFullPath} -v $(pwd)/../o3de-extras:/data/workspace/o3de-extras ${imageName} /bin/bash ${tempFileFullPath}`;
  }
  else {
    console.log(`running on a general purpose repo: ${folderName}`);
    command = `docker run --rm -v ${tempFileFullPath}:${tempFileFullPath} -v $(pwd)/../${folderName}:/data/workspace/repository ${imageName} /bin/bash ${tempFileFullPath}`;
  }

  // debug print the command
  console.log(`command: ${command}`);

  const output = execSync(command).toString();

  return output;
}

test('Docker Test', () => {
  let mainOutput = '';
  try {
    // const container = core.getInput('container');
    // const scriptPath = core.getInput('script-path');

    const container = 'khasreto/o3de-extras-daily_dev:latest';
    const scriptPath = 'test/test-script.sh';

    const scriptToExecute = execSync(`cat ${scriptPath}`).toString();

    // Run the main script on the modified container
    mainOutput = runContainerScript(container, scriptToExecute);
    core.info('Main script output:');
    core.info(mainOutput);

    // Perform assertions on the output as needed
  } catch (error) {
    if (error instanceof Error) {
      core.error(error.message);
      core.setFailed(error.message);
    }
  }
  expect(mainOutput).toContain('RESULT: ALL TESTS PASSED');
});