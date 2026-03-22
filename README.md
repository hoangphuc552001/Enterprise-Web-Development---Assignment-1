## Enterprise Web Development - Serverless REST Assignment.

__Name:__ Hoang Phuc Le

__Student ID:__ 20115747


### Links.
__Demo:__ https://youtu.be/OyipBtxxrEs

__GitHub:__ https://github.com/hoangphuc552001/Enterprise-Web-Development---Assignment-1


### Screenshots.

[ A screenshot of the App Web API from the API Gateway management console.

![][api]

Note: The Auth API is not required.
]

[A screenshot of your seeded table from DynamoDB.

![][db]
]

###  Implementation Highlights (If relevant).

#### Multi Stack
The application is organized into two CDK stacks: `AuthApiStack` and `Assignment1Stack`.

#### CDK Constructs
- AppApi extends Construct.
- AppDatabase extends Construct.

#### User Authentication and Authorization
The application uses **JWT-based authentication**. The `POST /auth/login` endpoint validates user credentials and issues a JWT, which is stored in an HTTP-only cookie.

#### Restricted Review Update

The `PUT /movies/{movieId}/reviews` endpoint enforces ownership in two ways: it first validates the JWT from the cookie and extracts the authenticated `userId`, then uses that `userId` as the `reviewerId` to update only that user’s review. It also checks that the review already exists or not.
#### DynamoDB LSI

A **Local Secondary Index** named `dateIx` is defined on `MoviesTable` with `date` as the sort key. This lets the `GET /reviews?movie=movieID&published=date` endpoint query reviews for a specific movie by publication date efficiently, without scanning the full table.

```ts
table.addLocalSecondaryIndex({
    indexName: "dateIx",
    sortKey: { name: "date", type: dynamodb.AttributeType.STRING },
    projectionType: dynamodb.ProjectionType.ALL,
});
```

#### Lambda Layers

Shared code (validation helpers, type definitions, utility functions) is packaged into a **Lambda Layer** (`layers/shared`). 

#### API Gateway Validation

Two **API Gateway Request Validators** are used:

- **Body Validator** – validates request bodies for `POST /movies/reviews` and `PUT /movies/{movieId}/reviews`.
- **Query Parameter Validator** – validates required query parameters for `GET /reviews`.

---

###  Extra (If relevant).

#### AWS X-Ray Tracing

All application Lambdas are created with `tracing: lambda.Tracing.ACTIVE`, and the API Gateway stage is deployed with `tracingEnabled: true`. This enables **AWS X-Ray** end-to-end distributed tracing.

#### CDK Custom Resource for Database Seeding

A **CDK Custom Resource** is implemented to seed the DynamoDB table with initial data upon stack deployment. This custom resource invokes a Lambda function that populates the `MoviesTable` with predefined movies and reviews.

#### Add npx cdx synth to ci pipeline
The CI pipeline is enhanced to include `npx cdk synth` to ensure that the CDK code synthesizes correctly before deployment.

[api]: ./images/api1.png
[db]: ./images/db.png


