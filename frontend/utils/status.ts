/**********************************
 * utility functions
 **********************************/
export function translateStatus(status: string): string {
  switch (status) {
    case "waiting":
      return "待機中";
    case "in_progress":
      return "処理中";
    case "completed":
      return "正常終了";
    case "failed":
      return "失敗";
    default:
      return "不明";
  }
}

export function getCheckStatusIcon(status: string): string {
  switch (status) {
    case "waiting":
      return "mdi:timer-sand";
    case "in_progress":
      return "mdi:sync";
    case "completed":
      return "mdi:check-circle";
    case "failed":
      return "mdi:alert-circle";
    default:
      return "mdi:help-circle";
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "waiting":
      return "text-yellow-500";
    case "in_progress":
      return "text-blue-500";
    case "completed":
      return "text-green";
    case "failed":
      return "text-red-500";
    default:
      return "text-gray-500";
  }
}
