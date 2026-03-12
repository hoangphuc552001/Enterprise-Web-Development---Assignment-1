import * as cdk from "aws-cdk-lib";
import * as apig from "aws-cdk-lib/aws-apigateway";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import * as path from "path";

type LambdaDefinition = {
    id: string;
    entryFile: string;
};

export class Assignment1Stack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const commonFnProps = this.createCommonNodejsFunctionProps();
        const lambdas = this.createLambdas(commonFnProps);
        const api = this.createApiGateway(lambdas);

        new cdk.CfnOutput(this, "ApiEndpoint", {
            value: api.url,
            description: "API Gateway Endpoint",
        });
    }

    private createCommonNodejsFunctionProps() {
        return {
            timeout: cdk.Duration.seconds(10),
            memorySize: 128,
            runtime: cdk.aws_lambda.Runtime.NODEJS_22_X,
            handler: "handler",
            environment: {
                REGION: cdk.Aws.REGION,
            },
        };
    }

    private getLambdaDefinitions(): LambdaDefinition[] {
        return [
            { id: "GetReviewsByMovieFn", entryFile: "getReviewsByMovie.ts" },
            { id: "GetReviewsByDateAndMovieFn", entryFile: "getReviewByMovieAndPublished.ts" },
            { id: "AddReviewFn", entryFile: "addMovieReview.ts" },
            { id: "UpdateReviewFn", entryFile: "updateMovieReview.ts" },
        ];
    }

    private createLambdas(commonProps: Omit<lambdanode.NodejsFunctionProps, "entry">): { [key: string]: lambdanode.NodejsFunction } {
        const lambdas: { [key: string]: lambdanode.NodejsFunction } = {};

        for (const definition of this.getLambdaDefinitions()) {
            lambdas[definition.id] = new lambdanode.NodejsFunction(this, definition.id, {
                ...commonProps,
                entry: path.join(__dirname, "..", "lambdas", definition.entryFile),
            });
        }

        return lambdas;
    }

    private createApiGateway(lambdas: { [key: string]: lambdanode.NodejsFunction }): apig.RestApi {
        const api = new apig.RestApi(this, "AppApi", {
            description: "Movie Review App RestApi",
            endpointTypes: [apig.EndpointType.REGIONAL],
            defaultCorsPreflightOptions: {
                allowOrigins: apig.Cors.ALL_ORIGINS,
            },
            deployOptions: { stageName: "dev" },
        });

        // /movies/{movieId}/reviews
        const moviesResource = api.root.addResource("movies");
        const movieIdResource = moviesResource.addResource("{movieId}");
        const movieReviewsResource = movieIdResource.addResource("reviews");

        movieReviewsResource.addMethod("GET", new apig.LambdaIntegration(lambdas["GetReviewsByMovieFn"], { proxy: true }));
        movieReviewsResource.addMethod("PUT", new apig.LambdaIntegration(lambdas["UpdateReviewFn"], { proxy: true }));

        // /movies/reviews
        const moviesReviewsResource = moviesResource.addResource("reviews");
        moviesReviewsResource.addMethod("POST", new apig.LambdaIntegration(lambdas["AddReviewFn"], { proxy: true }));

        // /reviews
        const reviewsResource = api.root.addResource("reviews");
        reviewsResource.addMethod("GET", new apig.LambdaIntegration(lambdas["GetReviewsByDateAndMovieFn"], { proxy: true }));

        return api;
    }
}
