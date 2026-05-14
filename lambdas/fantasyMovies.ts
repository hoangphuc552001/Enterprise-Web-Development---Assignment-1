import { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

const ddbClient = new DynamoDBClient({ region: process.env.REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        const email = (event.requestContext as any).authorizer?.userId;
        if (!email) {
            return {
                statusCode: 401,
                headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ message: "Unauthorized" }),
            };
        }

        const pk = `u#${email}`;
        const sk = "fantasy";

        if (event.httpMethod === "GET") {
            const command = new GetCommand({
                TableName: process.env.TABLE_NAME,
                Key: { PK: pk, SK: sk },
            });

            const result = await ddbDocClient.send(command);
            
            return {
                statusCode: 200,
                headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify(result.Item?.movies || []),
            };
        }

        if (event.httpMethod === "PUT") {
            const body = event.body ? JSON.parse(event.body) : undefined;
            if (!body || !Array.isArray(body.movies)) {
                return {
                    statusCode: 400,
                    headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
                    body: JSON.stringify({ message: "Invalid body. Requires 'movies' array." }),
                };
            }

            const command = new PutCommand({
                TableName: process.env.TABLE_NAME,
                Item: {
                    PK: pk,
                    SK: sk,
                    movies: body.movies,
                },
            });

            await ddbDocClient.send(command);

            return {
                statusCode: 200,
                headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ message: "Fantasy movies updated successfully" }),
            };
        }

        return {
            statusCode: 405,
            headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ message: "Method Not Allowed" }),
        };
    } catch (error: any) {
        return {
            statusCode: 500,
            headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ message: error.message }),
        };
    }
};
