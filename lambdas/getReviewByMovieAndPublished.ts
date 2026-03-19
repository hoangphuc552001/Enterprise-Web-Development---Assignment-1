import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { validateGetReviewsByMovieParams } from "shared/validation";

const ddbClient = new DynamoDBClient({ region: process.env.REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const queryParams = event.queryStringParameters || {};

        const isValid = validateGetReviewsByMovieParams(queryParams);
        if (!isValid) {
            return {
                statusCode: 400,
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    message: "Validation failed",
                    errors: validateGetReviewsByMovieParams.errors,
                }),
            };
        }

        const movieId = queryParams.movie;
        const published = queryParams.published;

        if (!movieId || !published) {
            return {
                statusCode: 400,
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    message: "Both movie and published query parameters are required",
                }),
            };
        }

        const command = new QueryCommand({
            TableName: process.env.TABLE_NAME,
            IndexName: "dateIx",
            KeyConditionExpression: "PK = :pk AND #date = :date",
            ExpressionAttributeNames: {
                "#date": "date",
            },
            ExpressionAttributeValues: {
                ":pk": `m#${movieId}`,
                ":date": published,
            },
        });

        const result = await ddbDocClient.send(command);

        if (!result.Items || result.Items.length === 0) {
            return {
                statusCode: 404,
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    message: "No review found for this movie with the specified date",
                }),
            };
        }

        const review = result.Items[0];

        return {
            statusCode: 200,
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                movieId: review.movieId,
                published: review.date,
                review: {
                    reviewerId: review.email,
                    text: review.text,
                },
            }),
        };
    } catch (error: any) {
        return {
            statusCode: 500,
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ message: error.message }),
        };
    }
};
