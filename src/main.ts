import {wait} from './wait'
import * as core from '@actions/core';
import { execSync } from 'child_process';
import { readFile, writeFile, rm, mkdir, stat } from 'fs';

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

      // wait for 1 second before writing to the file
      setTimeout(() => {
        // write the file to the temp file
        writeFile(tempFileFullPath, scriptToExecute.toString(), (err) => {
          if (err) {
            console.error(`Failed to write to file: ${tempFileFullPath}`);
            throw err;
          }
          console.log(`File written successfully: ${tempFileFullPath}`);

          // check if the created file is a file
          stat(tempFileFullPath, (err, stats) => {
            if (err) {
              console.error(`Failed to retrieve file information: ${tempFileFullPath}`);
              throw err;
            }

            if (stats.isFile()) {
              console.log(`File verification successful: ${tempFileFullPath}`);
            } else {
              console.error(`Created file is not a file: ${tempFileFullPath}`);
              throw new Error(`Created file is not a file: ${tempFileFullPath}`);
            }
          });
        });
      }, 1000); // 1 second delay
    });
  });

  wait(1000); // 1 second delay

  // Execute the script inside the container

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
    console.log('running on a general purpose repo: ${folderName}');
    command = `docker run --rm -v ${tempFileFullPath}:${tempFileFullPath} -v $(pwd)/../${folderName}:/data/workspace/repository ${imageName} /bin/bash ${tempFileFullPath}`;
  }

  // debug print the command
  console.log(`command: ${command}`);

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