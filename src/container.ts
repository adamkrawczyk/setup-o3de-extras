import { execSync, spawnSync } from 'child_process';
import { writeToFile } from './io';
import { checkIfFile } from './file';
import { mkdir, rm } from 'fs';

export async function runContainerScript(imageName: string, scriptToExecute: string): Promise<string> {
  // Write the script to a temporary file
  const os = require('os');
  const path = require('path');

  const tempFilePath = path.join(os.tmpdir(), 'ci-test');
  const tempFileName = 'script.sh';
  const tempFileFullPath = path.join(tempFilePath, tempFileName);
  const containerScriptsPath = path.join(os.tmpdir(), 'scripts');
  const containerScriptFullPath = path.join(containerScriptsPath, tempFileName);

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
    } else {
      // Determine the working directory
      const repoPath = execSync('pwd').toString().trim();
      console.log(`Working directory: ${repoPath}`);

      // Determine the command based on the repo name
      let command = '';
      if (repoPath.endsWith('o3de-extras')) {
        console.log('o3de-extras detected');
        command = `docker run --rm -v ${tempFilePath}:${containerScriptsPath} -v ${repoPath}:/data/workspace/o3de-extras --workdir /data/workspace/o3de-extras ${imageName} /bin/bash ${containerScriptFullPath}`;
      } else {
        console.log(`Running on a general-purpose repo: ${repoPath}`);
        command = `docker run --rm -v ${tempFilePath}:${containerScriptsPath} -v ${repoPath}:/data/workspace/repository --workdir /data/workspace/repository ${imageName} /bin/bash ${containerScriptFullPath}`;
      }

      // Execute the Docker command using spawnSync
      const result = spawnSync('sh', ['-c', command]);

      if (result.error) {
        console.error('Command execution failed:', result.error);
        throw result.error;
      }

      const output = result.stdout.toString();
      return output;
    }
  } catch (error) {
    console.error(error);
    throw error;
  }
}
