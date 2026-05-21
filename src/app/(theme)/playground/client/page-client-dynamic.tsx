"use client";

import dynamic from "next/dynamic";

const PlaygroundEditorBody = dynamic(() => import("./page-client"), { ssr: false });

export default function PlaygroundEditorDynamic(props: any) {
  return <PlaygroundEditorBody {...props} />;
}
