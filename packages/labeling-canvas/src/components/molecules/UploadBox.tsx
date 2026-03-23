import {
  type ChangeEvent,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  useRef,
} from "react";

import { Button, Icon } from "../atoms";

interface UploadBoxProps {
  file?: File | File[] | null;
  datasourceId?: number | string;
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
  onFileUpload: (
    files: FileList,
    datasourceId?: number | string | undefined
  ) => void;
  onRemoveFile?: () => void;
}

const UploadBox = ({
  file, // 파일정보객체 또는 파일정보객체 배열
  datasourceId, // 컴포넌트가 배열로 만들어질 경우 식별 값 (optional)
  className,
  style,
  disabled = false, // 업로드 기능 비활성화 조건
  onFileUpload, // 파일 업로드 핸들러, 인풋 또는 드래그 된 파일배열 전체를 인자로 전달, datasourceId 있으면 두번째 인자로 전달
  onRemoveFile, // 파일 제거 핸들러
}: UploadBoxProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const baseClassName = ["upload-field", className].filter(Boolean).join(" ");

  const handleFileUpload = (files: FileList | null) => {
    if (!files) {
      return;
    }
    onFileUpload(files, datasourceId);
  };

  const handleDragEvent = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (disabled) {
      return;
    }
    handleFileUpload(event.dataTransfer.files);
  };

  const handleBrowseClick = () => {
    if (disabled) {
      return;
    }
    fileInputRef.current?.click();
  };

  const handleBrowseKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    handleBrowseClick();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFileUpload(event.target.files);
    event.target.value = "";
  };

  if (Array.isArray(file)) {
    return (
      <>
        {file.map((f) => (
          <div className={baseClassName} style={style} key={f.name}>
            <p>{f.name}</p>
            <Button style="transparent" onClick={onRemoveFile}>
              <Icon iconType="icon-delete" size="sm" />
            </Button>
          </div>
        ))}
      </>
    );
  }

  if (file) {
    return (
      <div className={baseClassName} style={style}>
        <p>{file.name}</p>
        <Button style="transparent" onClick={onRemoveFile}>
          <Icon iconType="icon-delete" size="sm" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={[baseClassName, disabled ? "disabled" : ""]
        .filter(Boolean)
        .join(" ")}
      style={style}
      onDragOver={handleDragEvent}
      onDragEnter={handleDragEvent}
      onDragLeave={handleDragEvent}
      onDrop={handleDrop}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
      <Icon iconType="icon-upload" size="sm" />
      <p>
        Drag & Drop or&nbsp;
        <span
          className="text-link"
          data-style="primary"
          onClick={handleBrowseClick}
          onKeyDown={handleBrowseKeyDown}
          role="button"
          tabIndex={0}
        >
          Browse
        </span>
      </p>
    </div>
  );
};

export default UploadBox;
