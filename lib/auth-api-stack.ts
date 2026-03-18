import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apig from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as node from "aws-cdk-lib/aws-lambda-nodejs";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as path from "path";

export class AuthApiStack extends cdk.Stack {
    public readonly userPoolId: string;
    public readonly userPoolClientId: string;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const userPool = new cognito.UserPool(this, "UserPool", {
            signInAliases: { username: true, email: true },
            selfSignUpEnabled: true,
            autoVerify: { email: true },
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        const appClient = userPool.addClient("AppClient", {
            authFlows: { userPassword: true },
        });

        this.userPoolId = userPool.userPoolId;
        this.userPoolClientId = appClient.userPoolClientId;

        const authFnProps: node.NodejsFunctionProps = {
            architecture: lambda.Architecture.ARM_64,
            runtime: lambda.Runtime.NODEJS_18_X,
            entry: path.join(__dirname, "..", "lambdas", "auth", "signup.ts"),
            timeout: cdk.Duration.seconds(10),
            memorySize: 128,
            environment: {
                USER_POOL_ID: userPool.userPoolId,
                CLIENT_ID: appClient.userPoolClientId,
                REGION: cdk.Aws.REGION,
            },
        };

        const signupFn = new node.NodejsFunction(this, "SignupFn", {
            ...authFnProps,
            entry: path.join(__dirname, "..", "lambdas", "auth", "signup.ts"),
        });

        const confirmSignupFn = new node.NodejsFunction(this, "ConfirmSignupFn", {
            ...authFnProps,
            entry: path.join(__dirname, "..", "lambdas", "auth", "confirm-signup.ts"),
        });

        const signinFn = new node.NodejsFunction(this, "SigninFn", {
            ...authFnProps,
            entry: path.join(__dirname, "..", "lambdas", "auth", "signin.ts"),
        });

        const signoutFn = new node.NodejsFunction(this, "SignoutFn", {
            ...authFnProps,
            entry: path.join(__dirname, "..", "lambdas", "auth", "signout.ts"),
        });

        const api = new apig.RestApi(this, "AuthServiceApi", {
            description: "Authentication Service RestApi",
            endpointTypes: [apig.EndpointType.REGIONAL],
            defaultCorsPreflightOptions: {
                allowOrigins: apig.Cors.ALL_ORIGINS,
            },
            deployOptions: {
                stageName: "dev",
            },
        });

        const authResource = api.root.addResource("auth");

        const signupResource = authResource.addResource("signup");
        signupResource.addMethod("POST", new apig.LambdaIntegration(signupFn));

        const confirmSignupResource = authResource.addResource("confirm-signup");
        confirmSignupResource.addMethod(
            "POST",
            new apig.LambdaIntegration(confirmSignupFn)
        );

        const signinResource = authResource.addResource("signin");
        signinResource.addMethod("POST", new apig.LambdaIntegration(signinFn));

        const signoutResource = authResource.addResource("signout");
        signoutResource.addMethod("GET", new apig.LambdaIntegration(signoutFn));

        new cdk.CfnOutput(this, "UserPoolIdOutput", {
            value: userPool.userPoolId,
        });
        new cdk.CfnOutput(this, "UserPoolClientIdOutput", {
            value: appClient.userPoolClientId,
        });
    }
}
