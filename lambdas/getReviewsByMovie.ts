import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    QueryCommand,
    GetCommand,
} from "@aws-sdk/lib-dynamodb";

const ddbClient = new DynamoDBClient({ region: process.env.REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const movieId = event.pathParameters?.movieId;
        if (!movieId) {
            return {
                statusCode: 400,
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ message: "movieId path parameter is required" }),
            };
        }

        const reviewer = event.queryStringParameters?.reviewer;

        if (reviewer) {
            const command = new GetCommand({
                TableName: process.env.TABLE_NAME,
                Key: {
                    PK: `m#${movieId}`,
                    SK: `r#${reviewer}`,
                },
            });

            const result = await ddbDocClient.send(command);

            if (!result.Item) {
                return {
                    statusCode: 404,
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                        message: `No review found for movie ${movieId} by reviewer ${reviewer}`,
                    }),
                };
            }

            return {
                statusCode: 200,
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    data: {
                        movieId: result.Item.movieId,
                        reviewerId: result.Item.reviewerId,
                        date: result.Item.date,
                        text: result.Item.text,
                    },
                }),
            };
        }

        const command = new QueryCommand({
            TableName: process.env.TABLE_NAME,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
            ExpressionAttributeValues: {
                ":pk": `m#${movieId}`,
                ":sk": "r#",
            },
        });

        const result = await ddbDocClient.send(command);

        return {
            statusCode: 200,
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                data: (result.Items || []).map((item) => ({
                    movieId: item.movieId,
                    reviewerId: item.reviewerId,
                    date: item.date,
                    text: item.text,
                })),
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
