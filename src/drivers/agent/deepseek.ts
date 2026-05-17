import { BaseDriver } from "../base-driver";
import CommonAgentDriverImplementation, { CommonAgentMessage } from "./common";

interface DeepSeekResponse {
  choices: { message: { role: string; content: string } }[];
}

export class DeepSeekDriver extends CommonAgentDriverImplementation {
  constructor(
    protected driver: BaseDriver,
    protected token: string,
    protected model: string = "deepseek-chat"
  ) {
    super(driver);
  }

  async query(messages: CommonAgentMessage[]): Promise<string> {
    const response = await fetch(
      "https://api.deepseek.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0,
          messages: messages,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
    }

    const jsonResponse = (await response.json()) as DeepSeekResponse;
    return jsonResponse.choices[0].message.content;
  }
}
