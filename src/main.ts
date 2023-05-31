import * as core from '@actions/core';
import { execSync, spawnSync } from 'child_process';
import { readFile, writeFile, rm, mkdir, stat } from 'fs';

function writeToFile(filePath: string, data: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    writeFile(filePath, data, (err) => {
      if (err) {
        console.error(`Failed to write to file: ${filePath}`);
        reject(err);
      } else {
        console.log(`File written successfully: ${filePath}`);
        resolve();
      }
    });
  });
}

function checkIfFile(filePath: string): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    stat(filePath, (err, stats) => {
      if (err) {
        console.error(`Failed to retrieve file information: ${filePath}`);
        reject(err);
      } else {
        resolve(stats.isFile());
      }
    });
  });
}

async function runContainerScript(imageName: string, scriptToExecute: string): Promise<string> {
  // Write the script to a temporary file
  const os = require('os');
  const path = require('path');

  const tempFilePath = os.tmpdir();
  const tempFileName = 'script.sh';
  const tempFileFullPath = path.join(tempFilePath, tempFileName);

  try {
    // try to remove the file asynchronously
    await new Promise<void>((resolve, reject) => {
      rm(tempFilePath, { recursive: true }, (err) => {
        if (err) {
          // do nothing
        }
        resolve();
      });
    });

    // create the directory
    await new Promise<void>((resolve, reject) => {
      mkdir(tempFilePath, { recursive: true }, (err) => {
        if (err) {
          console.error(`Failed to create directory: ${tempFilePath}`);
          reject(err);
        } else {
          resolve();
        }
      });
    });

    // wait for 1 second before writing to the file
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 1000); // 1 second delay
    });

    // write the file to the temp file
    await writeToFile(tempFileFullPath, scriptToExecute.toString());

    // check if the created file is a file
    const isFile = await checkIfFile(tempFileFullPath);
    if (!isFile) {
      console.error(`Created file is not a file: ${tempFileFullPath}`);
      throw new Error(`Created file is not a file: ${tempFileFullPath}`);
    }

    // Determine the working directory
    const repoPath = execSync('pwd').toString().trim();
    console.log(`Working directory: ${repoPath}`);

    // Determine the command based on the repo name
    let command = '';
    if (repoPath.endsWith('o3de-extras')) {
      console.log('o3de-extras detected');
      command = `docker run --rm -v ${tempFileFullPath}:${tempFileFullPath} -v ${repoPath}:/data/workspace/o3de-extras --workdir /data/workspace/o3de-extras ${imageName} /bin/bash ${tempFileFullPath}`;
    } else {
      console.log(`Running on a general-purpose repo: ${repoPath}`);
      command = `docker run --rm -v ${tempFileFullPath}:${tempFileFullPath} -v ${repoPath}:/data/workspace/repository --workdir /data/workspace/repository ${imageName} /bin/bash ${tempFileFullPath}`;
    }

    // Execute the Docker command using spawnSync
    const result = spawnSync('sh', ['-c', command]);

    if (result.error) {
      console.error('Command execution failed:', result.error);
      throw result.error;
    }

    const output = result.stdout.toString();
    return output;
  } catch (error) {
    console.error(error);
    throw error;
  }
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
    const mainOutput = await runContainerScript(container, scriptToExecute);
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
