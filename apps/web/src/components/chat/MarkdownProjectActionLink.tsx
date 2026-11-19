import {
  MAX_SCRIPT_ID_LENGTH,
  type EnvironmentId,
  type ProjectScript,
  type ScopedThreadRef,
} from "@t3tools/contracts";
import { projectScriptTerminalInput, resolveProjectScripts } from "@t3tools/shared/projectScripts";
import { PlayIcon } from "lucide-react";

import { useEnvironmentSettings } from "~/hooks/useSettings";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import {
  MARKDOWN_PILL_CLASS_NAME,
  MARKDOWN_PILL_ICON_CLASS_NAME,
  MARKDOWN_PILL_INTERACTIVE_CLASS_NAME,
} from "./markdownPill";
import { useProjects, useThreadShell } from "~/state/entities";

// Maker fork: `[label](t3-action:<script-id>)` in a message is a small button that runs that
// project action in a side-panel terminal of its own. Clicking again reruns it there, and the
// terminal closes when the command succeeds.

const ACTION_HREF_PATTERN = /^t3-action:([a-z0-9][a-z0-9-]*)$/;

/** The script id a `t3-action:<id>` href names, or null. */
export function parseProjectActionHref(href: string): string | null {
  const id = ACTION_HREF_PATTERN.exec(href)?.[1];
  return id && id.length <= MAX_SCRIPT_ID_LENGTH ? id : null;
}

/** Types the command so the shell exits after it succeeds; after a failure it stays to read. */
export function projectActionTerminalInput(command: string): string {
  return projectScriptTerminalInput(`{ ${command.trim().replace(/[\s;]+$/, "")}; } && exit`);
}

/** The written label without a leading play sign, which the button draws itself. */
export function projectActionLabel(written: string | null, actionId: string): string {
  const label = written?.replace(/^\s*[▶►▷⏵]️?\s*/u, "").trim();
  return label || actionId;
}

function useThreadProjectScripts(
  threadRef: ScopedThreadRef,
  environmentId: EnvironmentId,
): ReadonlyArray<ProjectScript> {
  const projectId = useThreadShell(threadRef)?.projectId ?? null;
  const project = useProjects().find(
    (entry) => entry.environmentId === environmentId && entry.id === projectId,
  );
  const settings = useEnvironmentSettings(environmentId);
  if (!project) return [];
  const resolved = resolveProjectScripts(settings, project);
  // Settings can fold project scripts into global defaults; the project's own still count.
  return [...resolved, ...project.scripts.filter((s) => !resolved.some((r) => r.id === s.id))];
}

const PILL = MARKDOWN_PILL_CLASS_NAME;

function UnavailableAction(props: { readonly label: string; readonly reason: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<span tabIndex={0} className={`${PILL} text-muted-foreground opacity-70`} />}
      >
        <PlayIcon className={`${MARKDOWN_PILL_ICON_CLASS_NAME} opacity-60`} aria-hidden />
        {props.label}
      </TooltipTrigger>
      <TooltipPopup side="top">{props.reason}</TooltipPopup>
    </Tooltip>
  );
}

export function MarkdownProjectActionLink(props: {
  readonly threadRef: ScopedThreadRef | undefined;
  readonly actionId: string;
  readonly written: string | null;
  readonly onRunShellCommand:
    | ((command: string, options?: { place?: "panel"; action?: string }) => void)
    | undefined;
}) {
  const label = projectActionLabel(props.written, props.actionId);
  if (!props.threadRef || !props.onRunShellCommand) {
    return <UnavailableAction label={label} reason="Actions can't run from here." />;
  }
  return (
    <ResolvedAction
      threadRef={props.threadRef}
      actionId={props.actionId}
      label={label}
      run={props.onRunShellCommand}
    />
  );
}

function ResolvedAction(props: {
  readonly threadRef: ScopedThreadRef;
  readonly actionId: string;
  readonly label: string;
  readonly run: (command: string, options?: { place?: "panel"; action?: string }) => void;
}) {
  const scripts = useThreadProjectScripts(props.threadRef, props.threadRef.environmentId);
  const script = scripts.find((entry) => entry.id === props.actionId);
  if (!script) {
    return (
      <UnavailableAction
        label={props.label}
        reason={`This project has no "${props.actionId}" action.`}
      />
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className={`${PILL} ${MARKDOWN_PILL_INTERACTIVE_CLASS_NAME}`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              props.run(script.command, { place: "panel", action: script.id });
            }}
          />
        }
      >
        <PlayIcon
          className={`${MARKDOWN_PILL_ICON_CLASS_NAME} fill-current text-success`}
          aria-hidden
        />
        {props.label}
      </TooltipTrigger>
      <TooltipPopup side="top">Run in side panel: {script.command}</TooltipPopup>
    </Tooltip>
  );
}
