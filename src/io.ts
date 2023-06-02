import { writeFile } from 'fs';

export function writeToFile(filePath: string, data: string): Promise<void> {
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