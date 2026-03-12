import * as cdk from "aws-cdk-lib";
import {Construct} from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as path from "path";
import * as iam from "aws-cdk-lib/aws-iam";

export class Assignment1Stack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const appCommonFnProps = {
            architecture: lambda.Architecture.ARM_64,
            timeout: cdk.Duration.seconds(10),
            memorySize: 128,
            runtime: lambda.Runtime.NODEJS_22_X,
            handler: "handler",
            environment: {
                REGION: cdk.Aws.REGION,
            },
        };

        // Functions
        const getReviewsByMovieFn = new lambdanode.NodejsFunction(
            this,
            "GetReviewsByMovieFn",
            {
                ...appCommonFnProps,
                entry: path.join(__dirname, "..", "lambdas", "getReviewsByMovie.ts"),
            }
        );

        const getReviewByMovieAndPublishedFn = new lambdanode.NodejsFunction(
            this,
            "GetReviewByMovieAndPublishedFn",
            {
                ...appCommonFnProps,
                entry: path.join(__dirname, "..", "lambdas", "getReviewByMovieAndPublished.ts"),
            }
        );

        const addMovieReviewFn = new lambdanode.NodejsFunction(
            this,
            "AddMovieReviewFn",
            {
                ...appCommonFnProps,
                entry: path.join(__dirname, "..", "lambdas", "addMovieReview.ts"),
            }
        );

        const updateMovieReviewFn = new lambdanode.NodejsFunction(
            this,
            "UpdateMovieReviewFn",
            {
                ...appCommonFnProps,
                entry: path.join(__dirname, "..", "lambdas", "updateMovieReview.ts"),
            }
        );

        const getReviewsByMovieFnURL = getReviewsByMovieFn.addFunctionUrl({
            authType: lambda.FunctionUrlAuthType.NONE,
            cors: {
                allowedOrigins: ["*"],
            },
        });

        const getReviewByMovieAndPublishedFnURL = getReviewByMovieAndPublishedFn.addFunctionUrl({
            authType: lambda.FunctionUrlAuthType.NONE,
            cors: {
                allowedOrigins: ["*"],
            },
        });

        const addMovieReviewFnURL = addMovieReviewFn.addFunctionUrl({
            authType: lambda.FunctionUrlAuthType.NONE,
            cors: {
                allowedOrigins: ["*"],
            },
        });

        const updateMovieReviewFnURL = updateMovieReviewFn.addFunctionUrl({
            authType: lambda.FunctionUrlAuthType.NONE,
            cors: {
                allowedOrigins: ["*"],
            },
        });

        getReviewsByMovieFn.addPermission("GetReviewsByMovieFunctionUrlPublicAccess", {
            principal: new iam.AnyPrincipal(),
            action: "lambda:InvokeFunctionUrl",
            functionUrlAuthType: lambda.FunctionUrlAuthType.NONE,
        });

        getReviewsByMovieFn.addPermission("GetReviewsByMovieFunctionPublicAccess", {
            principal: new iam.AnyPrincipal(),
            action: "lambda:InvokeFunction",
        });

        getReviewByMovieAndPublishedFn.addPermission("GetReviewByMovieAndPublishedFunctionUrlPublicAccess", {
            principal: new iam.AnyPrincipal(),
            action: "lambda:InvokeFunctionUrl",
            functionUrlAuthType: lambda.FunctionUrlAuthType.NONE,
        });

        getReviewByMovieAndPublishedFn.addPermission("GetReviewByMovieAndPublishedFunctionPublicAccess", {
            principal: new iam.AnyPrincipal(),
            action: "lambda:InvokeFunction",
        });

        addMovieReviewFn.addPermission("AddMovieReviewFunctionUrlPublicAccess", {
            principal: new iam.AnyPrincipal(),
            action: "lambda:InvokeFunctionUrl",
            functionUrlAuthType: lambda.FunctionUrlAuthType.NONE,
        });

        addMovieReviewFn.addPermission("AddMovieReviewFunctionPublicAccess", {
            principal: new iam.AnyPrincipal(),
            action: "lambda:InvokeFunction",
        });

        updateMovieReviewFn.addPermission("UpdateMovieReviewFunctionUrlPublicAccess", {
            principal: new iam.AnyPrincipal(),
            action: "lambda:InvokeFunctionUrl",
            functionUrlAuthType: lambda.FunctionUrlAuthType.NONE,
        });

        updateMovieReviewFn.addPermission("UpdateMovieReviewFunctionPublicAccess", {
            principal: new iam.AnyPrincipal(),
            action: "lambda:InvokeFunction",
        });

        new cdk.CfnOutput(this, "GetReviewsByMovieFnURL", {
            value: getReviewsByMovieFnURL.url,
        });

        new cdk.CfnOutput(this, "GetReviewByMovieAndPublishedFnURL", {
            value: getReviewByMovieAndPublishedFnURL.url,
        });

        new cdk.CfnOutput(this, "AddMovieReviewFnURL", {
            value: addMovieReviewFnURL.url,
        });

        new cdk.CfnOutput(this, "UpdateMovieReviewFnURL", {
            value: updateMovieReviewFnURL.url,
        });
    }
}
