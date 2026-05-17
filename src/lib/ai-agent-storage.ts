import AgentDriverList from "@/drivers/agent/list";
import { BaseDriver } from "@/drivers/base-driver";
import { useMemo } from "react";
import useSWR, { mutate } from "swr";

export type AgentProvider = "openai" | "deepseek";

export interface LocalAgentType {
  provider: AgentProvider;
  model: string;
  token: string;
}

export const PROVIDER_MODELS: Record<AgentProvider, string[]> = {
  openai: ["gpt-4o-mini", "gpt-4o"],
  deepseek: ["deepseek-chat", "deepseek-coder"],
};

export function getAgentFromLocalStorage(): LocalAgentType | undefined {
  if (typeof window === "undefined") return undefined;

  // Getting the driver from the local storage
  const agentRawData = localStorage.getItem("agent");
  if (!agentRawData) return undefined;

  // Parsing the agent data
  const agentData: LocalAgentType = JSON.parse(agentRawData);

  // Validate the data
  if (!agentData.provider || !["openai", "deepseek"].includes(agentData.provider)) return undefined;
  if (!agentData.model) return undefined;
  if (!agentData.token) return undefined;

  return agentData;
}

export function updateAgentFromLocalStorage(data: LocalAgentType) {
  localStorage.setItem("agent", JSON.stringify(data));
  mutate("/local-agent-setting", data);
}

export function useAvailableAIAgents(databaseDriver?: BaseDriver | null) {
  const { data: agentConfig } = useSWR(
    "/local-agent-setting",
    getAgentFromLocalStorage
  );

  return useMemo(() => {
    if (!databaseDriver) return undefined;
    return new AgentDriverList(databaseDriver, agentConfig);
  }, [databaseDriver, agentConfig]);
}
