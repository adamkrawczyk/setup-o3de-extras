import * as core from '@actions/core'
import {wait} from './wait'

async function run(): Promise<void> {
  try {
    // Download docker image
    const dockerImage: string = core.getInput('khasreto/o3de-extras-daily_dev')
    core.debug(`Downloading ${dockerImage} ...`) // 
    core.debug(new Date().toTimeString())
    await wait(parseInt(dockerImage, 10))
    core.debug(new Date().toTimeString())
    // Run docker image with custom script script.sh
    const script: string = core.getInput('script.sh')
    core.debug(`Running ${script} ...`) //
    core.debug(new Date().toTimeString())
    await wait(parseInt(script, 10))
    core.debug(new Date().toTimeString())
    // Set output
    core.setOutput('time', new Date().toTimeString())
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
