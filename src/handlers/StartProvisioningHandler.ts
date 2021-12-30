import 'source-map-support/register';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { AWSError, CodeBuild, S3 } from 'aws-sdk';
import { StartProvisioningInput } from './StartProvisioningInput';
import { StartProvisioningOutput } from './StartProvisioningOutput';
import { createZip, downloadAndExtract } from './util';
import Eta from 'eta';
import { v4 as uuidv4 } from 'uuid';

const codeBuildClient = new CodeBuild();
const s3Client = new S3();

/**
 * A simple example includes a HTTP get method.
 */
export const StartProvisioningHandler = async ({
    templateSourceUrl
}: StartProvisioningInput): Promise<StartProvisioningOutput> => {
    console.log('Received event', templateSourceUrl);
    const projectName: string = process.env['CODE_BUILD_NAME']!;
    console.log(`projectName ${projectName}`);
    console.log('env vars');
    console.log(process.env);

    console.log('Download');
    const templateArchive = await downloadAndExtract(templateSourceUrl);
    console.log('Downloaded');
    const protonInput = {
        service: {
            name: 'service_1'
        },
        service_instance: {
            name: 'instance_1'
        },
        environment: {
            name: 'environment_1'
        }
    };
    templateArchive['proton-input.json'] = Buffer.from(
        JSON.stringify(protonInput, null, 2),
        'utf-8'
    );
    const buildSpec = templateArchive['buildSpec.yaml'].toString('utf-8');

    const sourceKey = `${uuidv4()}.zip`;
    const sourceBucket: string = process.env['CODE_BUILD_SOURCE_BUCKET_NAME']!;
    const source = createZip(templateArchive); // proton-input.json has been modified

    console.log(`Uploading object ${sourceKey} to bucket ${sourceBucket}`);

    await s3Client
        .putObject({
            Key: sourceKey,
            Bucket: sourceBucket,
            Body: source
        })
        .promise();

    console.log('Starting build to S3');
    const r = await codeBuildClient
        .startBuild({
            projectName,
            buildspecOverride: buildSpec,
            sourceLocationOverride: `${sourceBucket}/${sourceKey}`,
            sourceTypeOverride: 'S3'
        })
        .promise();
    console.log('Build started', r);
    const deploymentId = r.build!.arn!;
    console.log(`Deployment ID: ${deploymentId}`);
    return {
        deploymentId
    };
};
