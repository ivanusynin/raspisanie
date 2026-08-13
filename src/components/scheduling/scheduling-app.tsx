"use client";

import { useState } from "react";
import { useScheduling } from "@/lib/scheduling/scheduling-context";
import { MatrixView } from "./matrix-view";
import { SetupWizard } from "./setup-wizard";

export function SchedulingApp() {
  const { data } = useScheduling();
  const [editing, setEditing] = useState(false);

  const hasData =
    data.teachers.length > 0 ||
    data.topics.length > 0 ||
    data.locations.length > 0 ||
    data.groups.length > 0;

  if (!hasData || editing) {
    return <SetupWizard onDone={() => setEditing(false)} />;
  }

  return <MatrixView showSetup={() => setEditing(true)} />;
}
