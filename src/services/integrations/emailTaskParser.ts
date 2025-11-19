import { ExternalTaskPayload } from '../../types/integrations';
const SUBJECT_REGEX = /^subject:\s*(.*)$/im;
const DUE_REGEX = /^due(?:-date)?:\s*(.*)$/im;
const PRIORITY_REGEX = /^priority:\s*(low|medium|high|urgent)$/im;

function parseIsoDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

export function parseEmailToTasks(rawEmail: string): ExternalTaskPayload[] {
  const subjectMatch = rawEmail.match(SUBJECT_REGEX);
  const dueMatch = rawEmail.match(DUE_REGEX);
  const priorityMatch = rawEmail.match(PRIORITY_REGEX);

  const title = subjectMatch?.[1]?.trim() || 'Email Task';
  const dueDate = parseIsoDate(dueMatch?.[1]?.trim());
  const priorityTag = priorityMatch?.[1]?.toLowerCase();

  const bodyStart = rawEmail.indexOf('\n\n');
  const description = bodyStart !== -1 ? rawEmail.slice(bodyStart).trim() : rawEmail.trim();

  return [
    {
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2),
      providerId: 'google-tasks',
      title,
      description,
      dueDate,
      status: 'needs-action',
      labels: priorityTag ? [`priority:${priorityTag}`] : [],
      sourceData: {
        origin: 'email-import',
      },
    },
  ];
}
