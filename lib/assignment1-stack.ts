import * as cdk from "aws-cdk-lib";
import * as apig from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
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

        const sharedLayer = new lambda.LayerVersion(this, "SharedLayer", {
            compatibleRuntimes: [lambda.Runtime.NODEJS_22_X],
            code: lambda.Code.fromAsset(path.join(__dirname, "..", "layers", "shared")),
            description: "Shared validation layer",
        });

        const table = this.createDynamoDBTable();
        const commonFnProps = this.createCommonNodejsFunctionProps(table.tableName, sharedLayer);
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
        tableName: string,
        sharedLayer: lambda.LayerVersion
    ): Omit<lambdanode.NodejsFunctionProps, "entry"> {
        return {
            architecture: cdk.aws_lambda.Architecture.ARM_64,
            timeout: cdk.Duration.seconds(10),
            memorySize: 128,
            runtime: cdk.aws_lambda.Runtime.NODEJS_22_X,
            handler: "handler",
            layers: [sharedLayer],
            environment: {
                REGION: cdk.Aws.REGION,
                TABLE_NAME: tableName,
            },
            bundling: {
                externalModules: ["shared", "@aws-sdk/*", "@smithy/*"],
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

        const bodyValidator = api.addRequestValidator("BodyValidator", {
            requestValidatorName: "body-validator",
            validateRequestBody: true,
            validateRequestParameters: false,
        });

        const queryParamsValidator = api.addRequestValidator("QueryParamsValidator", {
            requestValidatorName: "query-params-validator",
            validateRequestBody: false,
            validateRequestParameters: true,
        });

        const addReviewModel = api.addModel("AddReviewModel", {
            contentType: "application/json",
            modelName: "AddReviewModel",
            schema: {
                type: apig.JsonSchemaType.OBJECT,
                required: ["movieId", "date", "text"],
                properties: {
                    movieId: {
                        type: apig.JsonSchemaType.INTEGER,
                        minimum: 1,
                    },
                    date: {
                        type: apig.JsonSchemaType.STRING,
                        pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}$",
                    },
                    text: {
                        type: apig.JsonSchemaType.STRING,
                        minLength: 1,
                        maxLength: 5000,
                    },
                },
                additionalProperties: false,
            },
        });

        const updateReviewModel = api.addModel("UpdateReviewModel", {
            contentType: "application/json",
            modelName: "UpdateReviewModel",
            schema: {
                type: apig.JsonSchemaType.OBJECT,
                required: ["text"],
                properties: {
                    text: {
                        type: apig.JsonSchemaType.STRING,
                        minLength: 1,
                        maxLength: 5000,
                    },
                },
                additionalProperties: false,
            },
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
                requestValidator: bodyValidator,
                requestModels: {
                    "application/json": updateReviewModel,
                },
            }
        );

        const moviesReviewsResource = moviesResource.addResource("reviews");

        moviesReviewsResource.addMethod(
            "POST",
            new apig.LambdaIntegration(lambdas["AddReviewFn"], {proxy: true}),
            {
                authorizer: requestAuthorizer,
                authorizationType: apig.AuthorizationType.CUSTOM,
                requestValidator: bodyValidator,
                requestModels: {
                    "application/json": addReviewModel,
                },
            }
        );

        const reviewsResource = api.root.addResource("reviews");
        reviewsResource.addMethod(
            "GET",
            new apig.LambdaIntegration(lambdas["GetReviewsByDateAndMovieFn"], {proxy: true}),
            {
                requestValidator: queryParamsValidator,
                requestParameters: {
                    "method.request.querystring.movie": true,
                    "method.request.querystring.published": true,
                },
            }
        );

        return api;
    }
}
