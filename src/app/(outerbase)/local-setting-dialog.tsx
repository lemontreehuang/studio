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
  getAgentFromLocalStorage,
  updateAgentFromLocalStorage,
} from "@/lib/ai-agent-storage";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export const localSettingDialog = createDialog(({ close }) => {
  const { t } = useTranslation();
  const [token, setToken] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const agentData = getAgentFromLocalStorage();
    if (!agentData) return;

    setToken(agentData.token);
  }, []);

  const onSaveClicked = useCallback(() => {
    updateAgentFromLocalStorage({
      provider: "openai",
      model: "gpt-4o-mini",
      token,
    });

    close(undefined);
  }, [token, close]);

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("nav.localSetting")}</DialogTitle>

        <DialogDescription>
          {t("settings.localSettingDesc")}
        </DialogDescription>
      </DialogHeader>

      <LabelInput
        type="password"
        label={t("settings.token")}
        placeholder={t("settings.token")}
        size="lg"
        value={token}
        onValueChange={setToken}
      />

      <DialogFooter>
        <Button size="lg" variant="primary" onClick={onSaveClicked}>
          {t("common.save")}
        </Button>
      </DialogFooter>
    </>
  );
});
