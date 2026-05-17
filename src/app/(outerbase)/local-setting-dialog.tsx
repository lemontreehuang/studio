import { createDialog } from "@/components/create-dialog";
import LabelInput from "@/components/label-input";
import { Button } from "@/components/orbit/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AgentProvider,
  getAgentFromLocalStorage,
  PROVIDER_MODELS,
  updateAgentFromLocalStorage,
} from "@/lib/ai-agent-storage";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const PROVIDER_LABELS: Record<AgentProvider, string> = {
  openai: "OpenAI",
  deepseek: "DeepSeek",
};

export const localSettingDialog = createDialog(({ close }) => {
  const { t } = useTranslation();
  const [provider, setProvider] = useState<AgentProvider>("deepseek");
  const [model, setModel] = useState<string>("deepseek-chat");
  const [token, setToken] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const agentData = getAgentFromLocalStorage();
    if (!agentData) return;

    setProvider(agentData.provider);
    setModel(agentData.model);
    setToken(agentData.token);
  }, []);

  const onProviderChange = useCallback(
    (newProvider: AgentProvider) => {
      setProvider(newProvider);
      // Auto-select first model of the new provider
      setModel(PROVIDER_MODELS[newProvider][0]);
    },
    []
  );

  const onSaveClicked = useCallback(() => {
    updateAgentFromLocalStorage({
      provider,
      model,
      token,
    });

    close(undefined);
  }, [provider, model, token, close]);

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("settings.aiConfig")}</DialogTitle>

        <DialogDescription>
          {t("settings.aiConfigDesc")}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">
            {t("settings.provider")}
          </label>
          <Select value={provider} onValueChange={onProviderChange}>
            <SelectTrigger className="bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PROVIDER_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">
            {t("settings.model")}
          </label>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROVIDER_MODELS[provider].map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <LabelInput
          type="password"
          label={t("settings.apiKey")}
          placeholder={t("settings.apiKeyPlaceholder")}
          size="lg"
          value={token}
          onValueChange={setToken}
        />
      </div>

      <DialogFooter>
        <Button size="lg" variant="primary" onClick={onSaveClicked}>
          {t("common.save")}
        </Button>
      </DialogFooter>
    </>
  );
});
