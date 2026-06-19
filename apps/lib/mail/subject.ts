/**
 * development 環境で送信するメール件名の先頭に `[DEV]` を付与する（DesignDoc §13.2 / #77）。
 *
 * production 以外（development / test など）はすべて prefix を付け、本番メールと
 * 区別できるようにする。
 */
export function withDevSubjectPrefix(subject: string, appEnv: string): string {
  return appEnv === 'production' ? subject : `[DEV] ${subject}`;
}
