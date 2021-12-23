import 'source-map-support/register';
import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult
} from 'aws-lambda';
import { AWSError, CodeBuild, S3 } from 'aws-sdk';
import { StartProvisioningInput } from './StartProvisioningInput'
import { StartProvisioningOutput } from './StartProvisioningOutput'
import { downloadAndExtract } from './util'
import Eta from 'eta'

/**
 * A simple example includes a HTTP get method.
 */
export const StartProvisioningHandler = async (
  event: StartProvisioningInput,
): Promise<StartProvisioningOutput> => {
  console.log('Received event', event)
  const projectName: string = process.env["CODE_BUILD_ID"]!
  console.log(`projectName ${projectName}`)
  console.log("env vars")
  console.log(process.env)

  console.log("Download")
  const templateArchive = await downloadAndExtract(event.templateSourceUrl)
  const protonInput = {
    "service": {
        "name": "service_1"
    },
    "service_instance": {
        "name": "instance_1"
    },
    "environment": {
        "name": "environment_1"
    }
  }
  templateArchive["proton-input.json"] = Buffer.from(JSON.stringify(protonInput, null, 2), "utf-8")
  const buildSpec = templateArchive["buildSpec.yaml"].toString("utf-8")
  const codeBuildClient = new CodeBuild()

  console.log("Starting build")
  const r = await codeBuildClient.startBuild({
    projectName,
    buildspecOverride: buildSpec,
    sourceLocationOverride: "stevpot-arrow-testing/cdk-template.zip"
  }).promise()
  console.log("Build started", r)
  const deploymentId = r.build!.arn!
  console.log(`Deployment ID: ${deploymentId}`)
  return {
    deploymentId 
  }
}
