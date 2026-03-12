import { APIGatewayProxyHandlerV2 } from "aws-lambda";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log("Event: ", JSON.stringify(event));

        const movieId = event?.pathParameters?.movieId ?? "1234";
        const requestBody = event?.body ? JSON.parse(event.body) : {};

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Fake movie review updated.",
                review: {
                    movieId,
                    reviewer: requestBody.reviewer ?? "userA",
                    reviewText: requestBody.reviewText ?? "Updated fake review text.",
                },
            }),
        };
    } catch (error: any) {
        console.log(JSON.stringify(error));
        return {
            statusCode: 500,
            body: JSON.stringify({ error }),
        };
    }
};
