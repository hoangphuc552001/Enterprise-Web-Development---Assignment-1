import * as cdk from "aws-cdk-lib";
import * as apig from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import {Construct} from "constructs";
import * as path from "path";

type LambdaDefinition = {
    id: string;
    entryFile: string;
};

type AppApiProps = {
    userPoolId: string;
    userPoolClientId: string;
    table: dynamodb.Table;
    sharedLayer: lambda.LayerVersion;
};

export class AppApi extends Construct {
    public readonly apiUrl: string;

    constructor(scope: Construct, id: string, props: AppApiProps) {
        super(scope, id);

        const commonFnProps = this.createCommonFnProps(props);
        const lambdas = this.createLambdas(commonFnProps);
        this.grantTablePermissions(props.table, lambdas);
        const postersBucket = this.createPostersBucket();
        const presignedUrlFn = this.createPresignedUrlFn(commonFnProps, postersBucket);
        const api = this.createApiGateway(lambdas, presignedUrlFn, props.userPoolId, props.userPoolClientId);
        this.apiUrl = api.url;
    }

    private createCommonFnProps(
        props: AppApiProps
    ): Omit<lambdanode.NodejsFunctionProps, "entry"> {
        return {
            architecture: lambda.Architecture.ARM_64,
            timeout: cdk.Duration.seconds(10),
            memorySize: 128,
            runtime: lambda.Runtime.NODEJS_22_X,
            handler: "handler",
            tracing: lambda.Tracing.ACTIVE,
            layers: [props.sharedLayer],
            environment: {
                REGION: cdk.Aws.REGION,
                TABLE_NAME: props.table.tableName,
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
            {id: "FavouritesFn", entryFile: "favourites.ts"},
            {id: "PlaylistsFn", entryFile: "playlists.ts"},
            {id: "FantasyMoviesFn", entryFile: "fantasyMovies.ts"},
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
                    entry: path.join(__dirname, "..", "..", "lambdas", definition.entryFile),
                }
            );
        }

        return lambdas;
    }

    private grantTablePermissions(
        table: dynamodb.Table,
        lambdas: { [key: string]: lambdanode.NodejsFunction }
    ): void {
        table.grantReadData(lambdas["GetReviewsByMovieFn"]);
        table.grantReadData(lambdas["GetReviewsByDateAndMovieFn"]);
        table.grantReadWriteData(lambdas["AddReviewFn"]);
        table.grantReadWriteData(lambdas["UpdateReviewFn"]);
        table.grantReadWriteData(lambdas["FavouritesFn"]);
        table.grantReadWriteData(lambdas["PlaylistsFn"]);
        table.grantReadWriteData(lambdas["FantasyMoviesFn"]);
    }

    private createPostersBucket(): s3.Bucket {
        const bucket = new s3.Bucket(this, "PostersBucket", {
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            blockPublicAccess: new s3.BlockPublicAccess({
                blockPublicAcls: false,
                blockPublicPolicy: false,
                ignorePublicAcls: false,
                restrictPublicBuckets: false,
            }),
            publicReadAccess: true,
            cors: [
                {
                    allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.GET],
                    allowedOrigins: ["*"],
                    allowedHeaders: ["*"],
                    maxAge: 3000,
                },
            ],
        });

        bucket.addToResourcePolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                principals: [new iam.AnyPrincipal()],
                actions: ["s3:GetObject"],
                resources: [bucket.arnForObjects("*")],
            })
        );

        return bucket;
    }

    private createPresignedUrlFn(
        commonProps: Omit<lambdanode.NodejsFunctionProps, "entry">,
        bucket: s3.Bucket
    ): lambdanode.NodejsFunction {
        const fn = new lambdanode.NodejsFunction(this, "GeneratePresignedUrlFn", {
            ...commonProps,
            entry: path.join(__dirname, "..", "..", "lambdas", "generatePresignedUrl.ts"),
            environment: {
                ...commonProps.environment,
                BUCKET_NAME: bucket.bucketName,
            },
            // Bundle ALL @aws-sdk/* and @smithy/* for this Lambda — the runtime's
            // built-in versions are too old for @aws-sdk/client-s3 v3.1000+
            // which requires @smithy/core/protocols (a newer sub-path export).
            bundling: {
                externalModules: ["shared"],
            },
        });

        bucket.grantPut(fn);

        return fn;
    }

    private createApiGateway(
        lambdas: { [key: string]: lambdanode.NodejsFunction },
        presignedUrlFn: lambdanode.NodejsFunction,
        userPoolId: string,
        userPoolClientId: string
    ): apig.RestApi {
        const api = new apig.RestApi(this, "AppApi", {
            description: "Movie Review App RestApi",
            endpointTypes: [apig.EndpointType.REGIONAL],
            defaultCorsPreflightOptions: {
                allowOrigins: apig.Cors.ALL_ORIGINS,
            },
            deployOptions: {stageName: "dev", tracingEnabled: true},
        });

        // Request validators
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

        // JSON Schema models
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

        // Custom Lambda authorizer
        const authorizerFn = new lambdanode.NodejsFunction(this, "AuthorizerFn", {
            architecture: lambda.Architecture.ARM_64,
            timeout: cdk.Duration.seconds(10),
            memorySize: 128,
            runtime: lambda.Runtime.NODEJS_22_X,
            handler: "handler",
            entry: path.join(__dirname, "..", "..", "lambdas", "auth", "authorizer.ts"),
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
                identitySources: [apig.IdentitySource.header("Authorization")],
                handler: authorizerFn,
                resultsCacheTtl: cdk.Duration.minutes(0),
            }
        );

        // Routes: /movies/{movieId}/reviews
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

        // Routes: /movies/reviews
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

        // Routes: /reviews
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

        // Routes: /user
        const userResource = api.root.addResource("user");

        // /user/favourites
        const favouritesResource = userResource.addResource("favourites");
        favouritesResource.addMethod(
            "GET",
            new apig.LambdaIntegration(lambdas["FavouritesFn"], {proxy: true}),
            {
                authorizer: requestAuthorizer,
                authorizationType: apig.AuthorizationType.CUSTOM,
            }
        );
        favouritesResource.addMethod(
            "PUT",
            new apig.LambdaIntegration(lambdas["FavouritesFn"], {proxy: true}),
            {
                authorizer: requestAuthorizer,
                authorizationType: apig.AuthorizationType.CUSTOM,
            }
        );

        // /user/playlists
        const playlistsResource = userResource.addResource("playlists");
        playlistsResource.addMethod(
            "GET",
            new apig.LambdaIntegration(lambdas["PlaylistsFn"], {proxy: true}),
            {
                authorizer: requestAuthorizer,
                authorizationType: apig.AuthorizationType.CUSTOM,
            }
        );
        playlistsResource.addMethod(
            "PUT",
            new apig.LambdaIntegration(lambdas["PlaylistsFn"], {proxy: true}),
            {
                authorizer: requestAuthorizer,
                authorizationType: apig.AuthorizationType.CUSTOM,
            }
        );

        // /user/fantasy-movies
        const fantasyMoviesResource = userResource.addResource("fantasy-movies");
        fantasyMoviesResource.addMethod(
            "GET",
            new apig.LambdaIntegration(lambdas["FantasyMoviesFn"], {proxy: true}),
            {
                authorizer: requestAuthorizer,
                authorizationType: apig.AuthorizationType.CUSTOM,
            }
        );
        fantasyMoviesResource.addMethod(
            "PUT",
            new apig.LambdaIntegration(lambdas["FantasyMoviesFn"], {proxy: true}),
            {
                authorizer: requestAuthorizer,
                authorizationType: apig.AuthorizationType.CUSTOM,
            }
        );

        const uploadResource = api.root.addResource("upload");
        const presignedUrlResource = uploadResource.addResource("presigned-url");
        presignedUrlResource.addMethod(
            "POST",
            new apig.LambdaIntegration(presignedUrlFn, {proxy: true}),
            {
                authorizer: requestAuthorizer,
                authorizationType: apig.AuthorizationType.CUSTOM,
            }
        );

        return api;
    }
}
