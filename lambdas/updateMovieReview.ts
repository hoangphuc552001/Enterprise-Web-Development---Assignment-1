import { Handler } from "aws-lambda";

export const handler: Handler = async (event: any) => {
    try {
        console.log("Event: ", JSON.stringify(event));

        const rawPath = event?.rawPath ?? "";
        const movieIdMatch = rawPath.match(/\/movies\/([^/]+)\/reviews\/?$/);
        const movieId = movieIdMatch?.[1] ?? event?.pathParameters?.movieId ?? "1234";
        const requestBody = event?.body ? JSON.parse(event.body) : {};

        return {
            statusCode: 200,
            headers: {
                "content-type": "application/json",
            },
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
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({ error }),
        };
    }
};
