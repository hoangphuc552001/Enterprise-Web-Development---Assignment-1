import { APIGatewayProxyHandlerV2 } from "aws-lambda";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log("Event: ", JSON.stringify(event));

        const requestBody = event?.body ? JSON.parse(event.body) : {};

        return {
            statusCode: 201,
            body: JSON.stringify({
                message: "Fake movie review created.",
                review: {
                    movieId: requestBody.movieId ?? "1234",
                    reviewer: requestBody.reviewer ?? "userA",
                    published: requestBody.published ?? "2026-03",
                    reviewText: requestBody.reviewText ?? "This is a fake review created by the POST endpoint.",
                    rating: requestBody.rating ?? 5,
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
