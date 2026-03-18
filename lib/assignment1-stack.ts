import * as cdk from "aws-cdk-lib";
import * as apig from "aws-cdk-lib/aws-apigateway";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import * as iam from "aws-cdk-lib/aws-iam";
import {Construct} from "constructs";
import * as path from "path";

type LambdaDefinition = {
    id: string;
    entryFile: string;
};

interface Assignment1StackProps extends cdk.StackProps {
    userPoolId: string;
    userPoolClientId: string;
}

export class Assignment1Stack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: Assignment1StackProps) {
        super(scope, id, props);

        const table = this.createDynamoDBTable();
        const commonFnProps = this.createCommonNodejsFunctionProps(table.tableName);
        const lambdas = this.createLambdas(commonFnProps);
        const seedFn = this.createSeedFunction(commonFnProps);

        this.grantTablePermissions(table, lambdas, seedFn);
        this.createSeedDataResource(seedFn);
        const api = this.createApiGateway(lambdas, props.userPoolId, props.userPoolClientId);

        new cdk.CfnOutput(this, "ApiEndpoint", {
            value: api.url,
            description: "API Gateway Endpoint",
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

    private createCommonNodejsFunctionProps(
        tableName: string
    ): Omit<lambdanode.NodejsFunctionProps, "entry"> {
        return {
            architecture: cdk.aws_lambda.Architecture.ARM_64,
            timeout: cdk.Duration.seconds(10),
            memorySize: 128,
            runtime: cdk.aws_lambda.Runtime.NODEJS_22_X,
            handler: "handler",
            environment: {
                REGION: cdk.Aws.REGION,
                TABLE_NAME: tableName,
            },
        };
    }

    private getLambdaDefinitions(): LambdaDefinition[] {
        return [
            {id: "GetReviewsByMovieFn", entryFile: "getReviewsByMovie.ts"},
            {id: "GetReviewsByDateAndMovieFn", entryFile: "getReviewByMovieAndPublished.ts"},
            {id: "AddReviewFn", entryFile: "addMovieReview.ts"},
            {id: "UpdateReviewFn", entryFile: "updateMovieReview.ts"},
        ];
    }

    private createLambdas(
        commonProps: Omit<lambdanode.NodejsFunctionProps, "entry">
    ): { [key: string]: lambdanode.NodejsFunction } {
        const lambdas: { [key: string]: lambdanode.NodejsFunction } = {};

        for (const definition of this.getLambdaDefinitions()) {
            lambdas[definition.id] = new lambdanode.NodejsFunction(
                this,
                definition.id,
                {
                    ...commonProps,
                    entry: path.join(__dirname, "..", "lambdas", definition.entryFile),
                }
            );
        }

        return lambdas;
    }

    private grantTablePermissions(
        table: dynamodb.Table,
        lambdas: { [key: string]: lambdanode.NodejsFunction },
        seedFn: lambdanode.NodejsFunction
    ): void {
        table.grantReadData(lambdas["GetReviewsByMovieFn"]);
        table.grantReadData(lambdas["GetReviewsByDateAndMovieFn"]);
        table.grantReadWriteData(lambdas["AddReviewFn"]);
        table.grantReadWriteData(lambdas["UpdateReviewFn"]);
        table.grantWriteData(seedFn);
    }

    private createSeedFunction(
        commonProps: Omit<lambdanode.NodejsFunctionProps, "entry">
    ): lambdanode.NodejsFunction {
        return new lambdanode.NodejsFunction(this, "SeedFn", {
            ...commonProps,
            entry: path.join(__dirname, "..", "lambdas", "seedData.ts"),
        });
    }

    private createApiGateway(
        lambdas: { [key: string]: lambdanode.NodejsFunction },
        userPoolId: string,
        userPoolClientId: string
    ): apig.RestApi {
        const api = new apig.RestApi(this, "AppApi", {
            description: "Movie Review App RestApi",
            endpointTypes: [apig.EndpointType.REGIONAL],
            defaultCorsPreflightOptions: {
                allowOrigins: apig.Cors.ALL_ORIGINS,
            },
            deployOptions: {stageName: "dev"},
        });

        const authorizerFn = new lambdanode.NodejsFunction(this, "AuthorizerFn", {
            architecture: cdk.aws_lambda.Architecture.ARM_64,
            timeout: cdk.Duration.seconds(10),
            memorySize: 128,
            runtime: cdk.aws_lambda.Runtime.NODEJS_22_X,
            handler: "handler",
            entry: path.join(__dirname, "..", "lambdas", "auth", "authorizer.ts"),
            environment: {
                USER_POOL_ID: userPoolId,
                CLIENT_ID: userPoolClientId,
                REGION: cdk.Aws.REGION,
            },
        });

        const requestAuthorizer = new apig.RequestAuthorizer(
            this,
            "RequestAuthorizer",
            {
                identitySources: [apig.IdentitySource.header("cookie")],
                handler: authorizerFn,
                resultsCacheTtl: cdk.Duration.minutes(0),
            }
        );

        const moviesResource = api.root.addResource("movies");
        const movieIdResource = moviesResource.addResource("{movieId}");
        const movieReviewsResource = movieIdResource.addResource("reviews");

        movieReviewsResource.addMethod(
            "GET",
            new apig.LambdaIntegration(lambdas["GetReviewsByMovieFn"], {proxy: true})
        );

        movieReviewsResource.addMethod(
            "PUT",
            new apig.LambdaIntegration(lambdas["UpdateReviewFn"], {proxy: true}),
            {
                authorizer: requestAuthorizer,
                authorizationType: apig.AuthorizationType.CUSTOM,
            }
        );

        const moviesReviewsResource = moviesResource.addResource("reviews");

        moviesReviewsResource.addMethod(
            "POST",
            new apig.LambdaIntegration(lambdas["AddReviewFn"], {proxy: true}),
            {
                authorizer: requestAuthorizer,
                authorizationType: apig.AuthorizationType.CUSTOM,
            }
        );

        const reviewsResource = api.root.addResource("reviews");
        reviewsResource.addMethod(
            "GET",
            new apig.LambdaIntegration(lambdas["GetReviewsByDateAndMovieFn"], {proxy: true})
        );

        return api;
    }
}
