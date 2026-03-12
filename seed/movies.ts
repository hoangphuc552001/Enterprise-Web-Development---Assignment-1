export const movies = [
    {
        PK: "m#1234",
        SK: "m#1234",
        movieId: 1234,
        title: "The Shawshank Redemption",
        date: "1994-09-23",
        overview:
            "A banker convicted of uxoricide forms a friendship over a quarter century with a hardened convict, while maintaining his innocence and trying to remain hopeful through simple compassion.",
    },
    {
        PK: "m#5678",
        SK: "m#5678",
        movieId: 5678,
        title: "The Godfather",
        date: "1972-03-24",
        overview:
            "The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant youngest son.",
    },
    {
        PK: "m#9012",
        SK: "m#9012",
        movieId: 9012,
        title: "Pulp Fiction",
        date: "1994-10-14",
        overview:
            "The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.",
    },
];

export const reviewers = [
    {
        PK: "r#jbloggs@here.com",
        SK: "r#jbloggs@here.com",
        reviewerId: "jbloggs@here.com",
        name: "Joe Bloggs",
    },
    {
        PK: "r#asmith@example.com",
        SK: "r#asmith@example.com",
        reviewerId: "asmith@example.com",
        name: "Alice Smith",
    },
];

export const reviews = [
    {
        PK: "m#1234",
        SK: "r#jbloggs@here.com",
        movieId: 1234,
        reviewerId: "jbloggs@here.com",
        date: "1995-04-20",
        text: "Moving, brilliant, inspirational, hopeful and empowering are all words that describe The Shawshank Redemption. With outstanding performances from its ensemble cast, this film is a masterpiece of storytelling.",
    },
    {
        PK: "m#1234",
        SK: "r#asmith@example.com",
        movieId: 1234,
        reviewerId: "asmith@example.com",
        date: "1995-06-15",
        text: "An incredible film that beautifully captures the resilience of the human spirit. Tim Robbins and Morgan Freeman deliver performances that will stay with you long after the credits roll.",
    },
    {
        PK: "m#5678",
        SK: "r#jbloggs@here.com",
        movieId: 5678,
        reviewerId: "jbloggs@here.com",
        date: "1972-05-10",
        text: "A cinematic masterpiece. Marlon Brando's portrayal of Don Vito Corleone is iconic. The film set the standard for all crime dramas that followed.",
    },
    {
        PK: "m#9012",
        SK: "r#asmith@example.com",
        movieId: 9012,
        reviewerId: "asmith@example.com",
        date: "1994-12-01",
        text: "Tarantino at his best. The non-linear narrative, sharp dialogue, and unforgettable characters make Pulp Fiction a groundbreaking film that redefined independent cinema.",
    },
];
