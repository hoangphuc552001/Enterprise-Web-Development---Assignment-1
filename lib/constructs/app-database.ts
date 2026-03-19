import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as custom from "aws-cdk-lib/custom-resources";
import * as iam from "aws-cdk-lib/aws-iam";
import {Construct} from "constructs";
import * as path from "path";

type AppDatabaseProps = {
    sharedLayer: lambda.LayerVersion;
};

export class AppDatabase extends Construct {
    public readonly table: dynamodb.Table;

    constructor(scope: Construct, id: string, props: AppDatabaseProps) {
        super(scope, id);

        this.table = this.createDynamoDBTable();
        const seedFn = this.createSeedFunction(props.sharedLayer);
        this.table.grantWriteData(seedFn);
        this.createSeedDataResource(seedFn);
    }

    private createDynamoDBTable(): dynamodb.Table {
        const table = new dynamodb.Table(this, "MoviesTable", {
            tableName: "MovieReviews",
            partitionKey: {name: "PK", type: dynamodb.AttributeType.STRING},
            sortKey: {name: "SK", type: dynamodb.AttributeType.STRING},
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        });

        table.addLocalSecondaryIndex({
            indexName: "dateIx",
            sortKey: {name: "date", type: dynamodb.AttributeType.STRING},
            projectionType: dynamodb.ProjectionType.ALL,
        });

        return table;
    }

    private createSeedFunction(
        sharedLayer: lambda.LayerVersion
    ): lambdanode.NodejsFunction {
        return new lambdanode.NodejsFunction(this, "SeedFn", {
            architecture: lambda.Architecture.ARM_64,
            timeout: cdk.Duration.seconds(10),
            memorySize: 128,
            runtime: lambda.Runtime.NODEJS_22_X,
            handler: "handler",
            layers: [sharedLayer],
            environment: {
                REGION: cdk.Aws.REGION,
                TABLE_NAME: "MovieReviews",
            },
            entry: path.join(__dirname, "..", "..", "lambdas", "seedData.ts"),
            bundling: {
                externalModules: ["shared", "@aws-sdk/*", "@smithy/*"],
            },
        });
    }

    private createSeedDataResource(seedFn: lambdanode.NodejsFunction): void {
        new custom.AwsCustomResource(this, "SeedDataResource", {
            onCreate: {
                service: "Lambda",
                action: "invoke",
                parameters: {
                    FunctionName: seedFn.functionName,
                },
                physicalResourceId: custom.PhysicalResourceId.of("SeedDataResource"),
            },
            policy: custom.AwsCustomResourcePolicy.fromStatements([
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ["lambda:InvokeFunction"],
                    resources: [seedFn.functionArn],
                }),
            ]),
        });
    }
}
