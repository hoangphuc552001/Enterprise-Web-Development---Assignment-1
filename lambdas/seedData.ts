import { Handler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { movies, reviewers, reviews } from "../seed/movies";

const ddbClient = new DynamoDBClient({ region: process.env.REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

export const handler: Handler = async () => {
    const allItems = [...movies, ...reviewers, ...reviews];

    const batchSize = 25;
    for (let i = 0; i < allItems.length; i += batchSize) {
        const batch = allItems.slice(i, i + batchSize);
        const command = new BatchWriteCommand({
            RequestItems: {
                [process.env.TABLE_NAME!]: batch.map((item) => ({
                    PutRequest: { Item: item },
                })),
            },
        });
        await ddbDocClient.send(command);
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ message: "Seed data loaded successfully" }),
    };
};
