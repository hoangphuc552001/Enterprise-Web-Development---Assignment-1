import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import {Construct} from "constructs";
import * as path from "path";
import {AppDatabase} from "./constructs/app-database";
import {AppApi} from "./constructs/app-api";

interface Assignment1StackProps extends cdk.StackProps {
    userPoolId: string;
    userPoolClientId: string;
}

export class Assignment1Stack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: Assignment1StackProps) {
        super(scope, id, props);

        const sharedLayer = new lambda.LayerVersion(this, "SharedLayer", {
            compatibleRuntimes: [lambda.Runtime.NODEJS_22_X],
            code: lambda.Code.fromAsset(path.join(__dirname, "..", "layers", "shared")),
            description: "Shared validation layer",
        });

        const database = new AppDatabase(this, "Database", {sharedLayer});

        const appApi = new AppApi(this, "AppApi", {
            table: database.table,
            sharedLayer,
            userPoolId: props.userPoolId,
            userPoolClientId: props.userPoolClientId,
        });

        new cdk.CfnOutput(this, "ApiEndpoint", {
            value: appApi.apiUrl,
            description: "API Gateway Endpoint",
        });
    }
}
