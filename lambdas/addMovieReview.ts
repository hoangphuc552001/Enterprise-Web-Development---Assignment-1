import { Handler } from "aws-lambda";

export const handler: Handler = async (event: any) => {
    try {
        console.log("Event: ", JSON.stringify(event));

        const requestBody = event?.body ? JSON.parse(event.body) : {};

        return {
            statusCode: 201,
            headers: {
                "content-type": "application/json",
            },
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
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({ error }),
        };
    }
};
