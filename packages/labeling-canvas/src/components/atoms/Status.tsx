import type { UIType } from "@/types/ui-type.interface";

interface StatusType
  extends UIType<"sm" | "md" | "lg", "primary" | "secondary" | "accent"> {
  value: "complete" | "incomplete" | "progress" | boolean | string;
}

function Status({ value, style = "primary", size = "md" }: StatusType) {
  // value를 정규화
  const getStatusInfo = () => {
    if (typeof value === "boolean") {
      return {
        status: value ? "complete" : "incomplete",
        label: value ? "완료" : "미완료",
      };
    }

    if (typeof value === "string") {
      const lowerValue = value.toLowerCase();
      if (lowerValue.includes("완료") || lowerValue.includes("complete")) {
        return { status: "complete", label: "완료" };
      }
      if (lowerValue.includes("진행") || lowerValue.includes("progress")) {
        return { status: "progress", label: "진행중" };
      }
      if (lowerValue.includes("미완료") || lowerValue.includes("incomplete")) {
        return { status: "incomplete", label: "미완료" };
      }
      return { status: "incomplete", label: value };
    }

    // value가 "complete", "incomplete", "progress"인 경우
    const statusLabels = {
      complete: "완료",
      incomplete: "미완료",
      progress: "진행중",
    };

    return {
      status: value,
      label: statusLabels[value as keyof typeof statusLabels] || value,
    };
  };

  const { status, label } = getStatusInfo();

  return (
    <span
      className={`status status-${status} status-${size}`}
      data-style={style}
    >
      {label}
    </span>
  );
}

export default Status;
