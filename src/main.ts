import * as core from '@actions/core';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

function runContainerScript(imageName: string, scriptToExecute: string): string {
    // Write the script to a temporary file
    const tempFilePath = '/tmp/script.sh';
    writeFileSync(tempFilePath, scriptToExecute);
  
    // debug print diredctory contents
    const ls = execSync('ls -la').toString();
    core.error(ls);
    const tree = execSync('tree').toString();
    core.error(tree);
    const pwd = execSync('pwd').toString();
    core.error(pwd);

    // Create a temporary container from the image and execute the script
    const command = `docker run --rm -v ${tempFilePath}:${tempFilePath} ${imageName} sh ${tempFilePath}`;
    const output = execSync(command).toString();
  
    return output;
  }

async function run(): Promise<void> {
  try {
    const container = 'khasreto/o3de-extras-daily_dev';  //core.getInput('container-name');
    const scriptToExecute = core.getInput('script-path');

    const output = runContainerScript(container, scriptToExecute);

    // Perform assertions on the output as needed
    if (output.includes('Expected output')) {
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