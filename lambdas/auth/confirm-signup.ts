import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import {
    CognitoIdentityProviderClient,
    ConfirmSignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({
    region: process.env.REGION,
});

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const body = event.body ? JSON.parse(event.body) : undefined;

        if (!body || !body.username || !body.code) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: "username and code are required",
                }),
            };
        }

        const command = new ConfirmSignUpCommand({
            ClientId: process.env.CLIENT_ID,
            Username: body.username,
            ConfirmationCode: body.code,
        });

        await client.send(command);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "User confirmed successfully. You can now sign in.",
            }),
        };
    } catch (error: any) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: error.message }),
        };
    }
};
