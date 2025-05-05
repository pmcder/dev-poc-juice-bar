export const dynamoConfig = {
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
  tables: {
    recipes: 'recipes',
    productionRuns: 'production_runs'
  }
}; 