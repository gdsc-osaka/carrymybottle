export const ISSUE_TYPES = [
  'broken',
  'stopped',
  'no_water',
  'leak_or_abnormal',
  'other',
] as const;

export type IssueType = (typeof ISSUE_TYPES)[number];

export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  broken: '故障',
  stopped: '停止中',
  no_water: '水が出ない',
  leak_or_abnormal: '水漏れ・異常',
  other: 'その他',
};
