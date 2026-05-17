"use client";

import {
  CommonConnectionConfig,
  ConnectionConfigEditor,
  validateTemplate,
} from "@/components/connection-config-editor";
import { ConnectionTemplateDictionary } from "@/components/connection-config-editor/template";
import { Button } from "@/components/orbit/button";
import { getDatabaseFriendlyName } from "@/components/resource-card/utils";
import { ArrowLeft, ArrowRight, FloppyDisk } from "@phosphor-icons/react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { mutate } from "swr";
import { createLocalConnection } from "../../hooks";

export const runtime = "edge";

export default function LocalNewBasePage() {
  const { driver } = useParams<{ driver: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const searchParams = useSearchParams()
  const [value, setValue] = useState<CommonConnectionConfig>({
    name: "",
    host: searchParams.get("url") ?? "",
    ...(driver === "starbase" ? {
      starbase_type: searchParams.get("type") ?? "internal"
    } : {}),
    token: searchParams.get("access-key") ?? ""
   });
  const [loading, setLoading] = useState(false);
  const [validateErrors, setValidateErrors] = useState<Record<string, string>>(
    {}
  );

  const template = useMemo(() => {
    return ConnectionTemplateDictionary[driver];
  }, [driver]);

  const onSave = useCallback(async () => {
    if (!template?.localTo) return;

    const errors = validateTemplate(value, template);
    setValidateErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    await createLocalConnection(template.localTo(value));
    router.push("/local");
  }, [template, value, router]);

  const onConnect = useCallback(async () => {
    if (!template?.localTo) return;

    const errors = validateTemplate(value, template);
    setValidateErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    const newConnection = await createLocalConnection(template.localTo(value));

    // Redirect to the connection page
    mutate("/local/bases");
    router.replace(
      newConnection.content.driver === "sqlite-filehandler"
        ? `/playground/client?s=${newConnection.id}`
        : `/client/s/${newConnection.content.driver ?? "turso"}?p=${newConnection.id}`
    );
  }, [template, value, router]);

  if (!template?.localTo || !template?.localFrom) {
    return <div>{t("common.error")}</div>;
  }

  return (
    <>
      <div className="container">
        <div className="my-8 flex">
          <Button variant="secondary" size="lg" href="/local" as="link">
            <ArrowLeft />
            {t("common.back")}
          </Button>

          <div className="flex-1"></div>
        </div>

        <div className="mb-8 text-2xl font-bold">
          <div>{t("connection.connectTo", { db: getDatabaseFriendlyName(driver) })}</div>
        </div>

        <ConnectionConfigEditor
          template={template}
          value={value}
          onChange={setValue}
          errors={validateErrors}
        />
      </div>

      <div className="bg-background sticky bottom-0 mt-12 border-t px-2 py-6">
        <div className="container flex gap-3">
          <Button
            variant="primary"
            size="lg"
            onClick={onConnect}
            disabled={loading}
          >
            <ArrowRight />
            {t("connection.connect")}
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={onSave}
            disabled={loading}
          >
            <FloppyDisk />
            {t("common.save")}
          </Button>
        </div>
      </div>
    </>
  );
}
