import { APIGatewayProxyHandlerV2 } from "aws-lambda";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log("Event: ", JSON.stringify(event));

        const movieId = event?.pathParameters?.movieId ?? "1234";
        const reviewer = event?.queryStringParameters?.reviewer;

        const reviews = [
            {
                movieId,
                reviewer: "userA",
                published: "1995-05",
                reviewText: "Fake review from userA.",
                rating: 4,
            },
            {
                movieId,
                reviewer: "userB",
                published: "1995-06",
                reviewText: "Fake review from userB.",
                rating: 5,
            },
        ];

        const filteredReviews = reviewer
            ? reviews.filter((review) => review.reviewer === reviewer)
            : reviews;

        return {
            statusCode: 200,
            body: JSON.stringify({
                movieId,
                reviewer: reviewer ?? null,
                reviews: filteredReviews,
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
