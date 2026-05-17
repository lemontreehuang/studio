import { CloudflareIcon } from "@/components/icons/outerbase-icon";
import { LocalAgentType } from "@/lib/ai-agent-storage";
import { ReactElement } from "react";
import { BaseDriver } from "../base-driver";
import { AgentBaseDriver, AgentPromptOption } from "./base";
import { ChatGPTDriver } from "./chatgpt";
import CloudflareAgentDriver from "./cloudflare";
import { DeepSeekDriver } from "./deepseek";

interface AgentDriverListItem {
  name: string;
  free?: boolean;
  available: boolean;
}

interface AgentDriverListGroup {
  name: string;
  title: ReactElement | string;
  agents: AgentDriverListItem[];
}

const DEFAULT_FREE_TIER_MODEL = "llama-3.3-70b";

export default class AgentDriverList {
  protected dict: Record<string, AgentBaseDriver | undefined> = {};
  protected defaultModelName: string | undefined;

  constructor(databaseDriver: BaseDriver, agentConfig?: LocalAgentType) {
    this.dict = {
      "llama-3.3-70b": new CloudflareAgentDriver(
        databaseDriver,
        "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
      ),

      "sqlcoder-7b-2": new CloudflareAgentDriver(
        databaseDriver,
        "@cf/defog/sqlcoder-7b-2"
      ),
    };

    // Register OpenAI driver if configured
    if (agentConfig?.provider === "openai" && agentConfig.token) {
      this.dict[agentConfig.model || "gpt-4o-mini"] = new ChatGPTDriver(
        databaseDriver,
        agentConfig.token
      );
    }

    // Register DeepSeek driver if configured
    if (agentConfig?.provider === "deepseek" && agentConfig.token) {
      this.dict[agentConfig.model || "deepseek-chat"] = new DeepSeekDriver(
        databaseDriver,
        agentConfig.token,
        agentConfig.model || "deepseek-chat"
      );
    }

    this.defaultModelName =
      localStorage.getItem("default-agent-model") ?? DEFAULT_FREE_TIER_MODEL;
  }

  setDefaultModelName(name: string) {
    this.defaultModelName = name;
    localStorage.setItem("default-agent-model", name);
  }

  getDefaultModelName(): string {
    return this.defaultModelName || DEFAULT_FREE_TIER_MODEL;
  }

  list(): AgentDriverListGroup[] {
    const groups: AgentDriverListGroup[] = [
      {
        name: "cloudflare",
        title: (
          <div className="flex items-center gap-1">
            Powered by{" "}
            <CloudflareIcon className="inline-flex h-4 w-4 text-orange-500" />
            Cloudflare Workers AI
          </div>
        ),
        agents: [
          {
            name: "llama-3.3-70b",
            free: true,
            available: !!this.dict["llama-3.3-70b"],
          },
          {
            name: "sqlcoder-7b-2",
            free: true,
            available: !!this.dict["sqlcoder-7b-2"],
          },
        ],
      },
    ];

    // Check for user-configured BYOK models
    const byokAgents: AgentDriverListItem[] = [];

    // Add any OpenAI models
    if (this.dict["gpt-4o-mini"]) {
      byokAgents.push({
        name: "gpt-4o-mini",
        available: true,
      });
    }
    if (this.dict["gpt-4o"]) {
      byokAgents.push({
        name: "gpt-4o",
        available: true,
      });
    }

    // Add any DeepSeek models
    if (this.dict["deepseek-chat"]) {
      byokAgents.push({
        name: "deepseek-chat",
        available: true,
      });
    }
    if (this.dict["deepseek-coder"]) {
      byokAgents.push({
        name: "deepseek-coder",
        available: true,
      });
    }

    if (byokAgents.length > 0) {
      groups.push({
        name: "byok",
        title: "自定义模型 (BYOK)",
        agents: byokAgents,
      });
    }

    return groups;
  }

  async run(
    modelName: string,
    message: string,
    sessionId: string | undefined,
    options: AgentPromptOption
  ): Promise<string> {
    const driver = this.dict[modelName];

    if (!driver) {
      throw new Error(`Selected model ${modelName} is not available`);
    }

    return await driver.run(message, sessionId, options);
  }
}
