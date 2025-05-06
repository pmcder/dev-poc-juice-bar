import { TextractClient, AnalyzeDocumentCommand, Block, BlockType, EntityType, Relationship } from "@aws-sdk/client-textract";
import { fetchAuthSession } from 'aws-amplify/auth';

interface KeyValueData {
  key: string;
  value: string | null;
}

interface TextractResponse {
  Blocks?: Block[];
}

class TextractService {
  private async getClient() {
    const { credentials } = await fetchAuthSession();
    return new TextractClient({
      region: process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1",
      credentials: credentials
    });
  }

  async analyzeDocument(imageBytes: Uint8Array): Promise<string> {
    try {
      const client = await this.getClient();
      const command = new AnalyzeDocumentCommand({
        Document: {
          Bytes: imageBytes,
        },
        FeatureTypes: ["FORMS", "TABLES"],
      });

      const response = await client.send(command);

      if (!response.Blocks || response.Blocks.length === 0) {
        throw new Error('No text blocks found in the document. Please ensure the document contains readable text.');
      }

      return this.formatTextractResponse(response);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Textract processing failed: ${error.message}`);
      }
      throw new Error('Unknown error occurred during document processing');
    }
  }

  private formatTextractResponse(response: TextractResponse): string {
    let formattedText = "";
    let allText = "";

    if (response.Blocks) {
      const blocks = response.Blocks;
      const keyValueMap = new Map<string, KeyValueData>();

      // First pass: collect all text and key-value pairs
      blocks.forEach((block: Block) => {
        // Collect all text
        if (block.BlockType === BlockType.WORD && block.Text) {
          allText += block.Text + " ";
        }
        
        // Collect key-value pairs
        if (block.BlockType === BlockType.KEY_VALUE_SET) {
          if (block.EntityTypes?.includes(EntityType.KEY)) {
            const key = this.getTextFromBlock(block, blocks);
            if (key && block.Id) {
              keyValueMap.set(block.Id, {
                key: key,
                value: null,
              });
            }
          } else if (block.EntityTypes?.includes(EntityType.VALUE)) {
            const keyBlock = blocks.find((b: Block) =>
              b.Relationships?.some((r: Relationship) =>
                r.Type === "CHILD" && r.Ids?.includes(block.Id || '')
              )
            );
            if (keyBlock && keyBlock.Id) {
              const keyData = keyValueMap.get(keyBlock.Id);
              if (keyData) {
                const value = this.getTextFromBlock(block, blocks);
                if (value) {
                  keyData.value = value;
                }
              }
            }
          }
        }
      });

      // Format the output
      if (keyValueMap.size > 0) {
        // Add key-value pairs
        keyValueMap.forEach((data) => {
          if (data.key && data.value) {
            formattedText += `${data.key}: ${data.value}\n`;
          }
        });
      }

      // Add all text if no key-value pairs were found or if it's different from the key-value text
      if (keyValueMap.size === 0 || allText.trim() !== formattedText.trim()) {
        if (formattedText) {
          formattedText += "\n\nAll Text:\n";
        }
        formattedText += allText.trim();
      }
    } else {
      throw new Error('No text blocks found in the document');
    }

    return formattedText.trim();
  }

  private getTextFromBlock(block: Block, blocks: Block[]): string | null {
    let text = "";
    if (block.Relationships) {
      block.Relationships.forEach((relationship: Relationship) => {
        if (relationship.Type === "CHILD" && relationship.Ids) {
          relationship.Ids.forEach((id: string) => {
            const childBlock = blocks.find((b) => b.Id === id);
            if (childBlock && childBlock.BlockType === BlockType.WORD && childBlock.Text) {
              text += childBlock.Text + " ";
            }
          });
        }
      });
    }
    return text.trim() || null;
  }
}

export const textractService = new TextractService(); 