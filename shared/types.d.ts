export interface AddReviewRequest {
    movieId: number;
    date: string;
    text: string;
}

export interface UpdateReviewRequest {
    text: string;
}

export interface GetReviewsQueryParams {
    reviewer?: string;
}

export interface GetReviewsByMovieParamsQueryParams {
    movie?: string;
    published?: string;
}
