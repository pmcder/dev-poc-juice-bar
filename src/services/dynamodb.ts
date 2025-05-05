import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  PutCommand, 
  ScanCommand 
} from '@aws-sdk/lib-dynamodb';
import { dynamoConfig } from '@/config/dynamodb';
import { fetchAuthSession } from 'aws-amplify/auth';

const getDynamoClient = async () => {
  const { credentials } = await fetchAuthSession();
  
  const client = new DynamoDBClient({ 
    region: dynamoConfig.region,
    credentials: credentials
  });
  
  return DynamoDBDocumentClient.from(client);
};

export interface Recipe {
  id: string;
  name: string;
  createdAt: string;
}

export interface ProductionRun {
  id: string;
  recipeId: string;
  recipeName: string;
  runDate: string;
  createdAt: string;
}

export const dynamoService = {
  // Recipe operations
  async createRecipe(name: string): Promise<Recipe> {
    const docClient = await getDynamoClient();
    const recipe: Recipe = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString()
    };

    await docClient.send(new PutCommand({
      TableName: dynamoConfig.tables.recipes,
      Item: recipe
    }));

    return recipe;
  },

  async getRecipes(): Promise<Recipe[]> {
    const docClient = await getDynamoClient();
    const result = await docClient.send(new ScanCommand({
      TableName: dynamoConfig.tables.recipes
    }));

    return result.Items as Recipe[];
  },

  // Production run operations
  async createProductionRun(recipeId: string, recipeName: string, runDate: string): Promise<ProductionRun> {
    const docClient = await getDynamoClient();
    const productionRun: ProductionRun = {
      id: crypto.randomUUID(),
      recipeId,
      recipeName,
      runDate,
      createdAt: new Date().toISOString()
    };

    await docClient.send(new PutCommand({
      TableName: dynamoConfig.tables.productionRuns,
      Item: productionRun
    }));

    return productionRun;
  },

  async getProductionRuns(): Promise<ProductionRun[]> {
    const docClient = await getDynamoClient();
    const result = await docClient.send(new ScanCommand({
      TableName: dynamoConfig.tables.productionRuns
    }));

    return result.Items as ProductionRun[];
  }
}; 