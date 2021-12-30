import 'source-map-support/register';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { AWSError, CodeBuild, S3 } from 'aws-sdk';
import { CheckProvisioningInput } from './CheckProvisioningInput';
import { CheckProvisioningOutput } from './CheckProvisioningOutput';
import { createZip, downloadAndExtract } from './util';

const codeBuildClient = new CodeBuild();

/**
 * A simple example includes a HTTP get method.
 */
export const CheckProvisioningHandler = async ({
    deploymentId
}: CheckProvisioningInput): Promise<CheckProvisioningOutput> => {
    console.log('Received event', deploymentId);

    const response = await codeBuildClient
        .batchGetBuilds({
            ids: [deploymentId]
        })
        .promise();

    if (!response.builds || !response.builds.length) {
        return {
            status: 'FAILED',
            statusMessage: 'Build ${deploymentId} was not found. It may have been deleted.'
        };
    }
    const buildStatus = response.builds[0].buildStatus;
    switch (buildStatus) {
        case 'SUCCEEDED':
            throw new Error('');
        case 'FAILED':
        case 'FAULT':
        case 'TIMED_OUT':
        case 'STOPPED':
            return {
                status: 'FAILED',
                statusMessage: 'Build ${deploymentId} exited with status ${buildStatus}'
            };
        case 'IN_PROGRESS':
            return {
                status: 'IN_PROGRESS',
                statusMessage: ''
            };
        default:
            throw new Error('Unknown build status ${');
    }
};
