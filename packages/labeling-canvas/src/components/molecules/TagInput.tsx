import { type ChangeEvent, type KeyboardEvent, useState } from "react";

import { type DirtyGuard } from "@/hooks/useDirtyGuard";
import { filterInputValue, INPUT_VALIDATION } from "@/utils/inputValidation";

import { Button, Icon, Input, Wrapper } from "../atoms";

interface TagInputProps {
  tags: string[]; // 태그 전체 배열
  onAddTag: (value: string) => void; // 태그 추가 함수 (추가 될 태그 값을 인자로 받음)
  onRemoveTag: (value: string) => void; // 태그 삭제 함수 (삭제 될 태그 값을 인자로 받음)
  dirty?: DirtyGuard;
}

const TagInput = ({ tags, onAddTag, onRemoveTag, dirty }: TagInputProps) => {
  const [tagInputValue, setTagInputValue] = useState("");

  function showValidationAlert(label: string, placeholder: string) {
    window.alert(`${label} input must follow: ${placeholder}`);
  }

  function validateInputValue(
    key: keyof typeof INPUT_VALIDATION,
    label: string,
    value: string
  ) {
    const spec = INPUT_VALIDATION[key];
    if (!value) return true;

    if (spec.maxLength && value.length > spec.maxLength) {
      showValidationAlert(label, spec.placeholder);
      return false;
    }

    if (filterInputValue(key, value) !== value) {
      showValidationAlert(label, spec.placeholder);
      return false;
    }

    const minLength = spec.minLength ?? 0;
    if (value.length < minLength) {
      return true;
    }

    if (!spec.regex.test(value)) {
      showValidationAlert(label, spec.placeholder);
      return false;
    }

    return true;
  }

  const tryAddTag = (value: string) => {
    const normalized = value.trim();
    if (!normalized) return false;
    if (!validateInputValue("Tag", "Tag", normalized)) {
      return false;
    }
    if (tags.length >= 5) {
      window.alert("You can add up to 5 tags.");
      return false;
    }
    if (tags.some((tag) => tag.toLowerCase() === normalized.toLowerCase())) {
      window.alert("Tag already exists.");
      return false;
    }
    if (onAddTag) {
      onAddTag(normalized);
      dirty?.markDirty();
      return true;
    }
    return false;
  };

  const handleTagInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    if (value && filterInputValue("Tag", value) !== value) {
      showValidationAlert("Tag", INPUT_VALIDATION.Tag.placeholder);
      return;
    }

    if (!value.includes(",")) {
      const maxLength = INPUT_VALIDATION.Tag.maxLength;
      if (value && maxLength && value.length > maxLength) {
        showValidationAlert("Tag", INPUT_VALIDATION.Tag.placeholder);
        return;
      }
      setTagInputValue(value);
      return;
    }

    const segments = value.split(",");
    const remainder = segments.pop() ?? "";

    if (
      remainder &&
      INPUT_VALIDATION.Tag.maxLength &&
      remainder.length > INPUT_VALIDATION.Tag.maxLength
    ) {
      showValidationAlert("Tag", INPUT_VALIDATION.Tag.placeholder);
      return;
    }

    segments.forEach((segment) => {
      tryAddTag(segment);
    });
    setTagInputValue(remainder);
  };

  const handleTagInputBlur = () => {
    if (!tagInputValue.trim()) return;
    const didAdd = tryAddTag(tagInputValue);
    if (didAdd) {
      setTagInputValue("");
    }
  };

  const handleTagInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Backspace" || tagInputValue.length > 0) return;
    if (tags.length === 0) return;
    onRemoveTag(tags[tags.length - 1]);
  };
  return (
    <Wrapper gapSize="0.5rem" isFull align="center">
      {tags.map((tag) => (
        <Wrapper
          key={tag}
          className="filter-item"
          isBordered
          isRounded
          align="center"
        >
          <p className="filter-item__label">{tag}</p>
          <Button
            style="transparent"
            size="sm"
            onClick={() => onRemoveTag(tag)}
          >
            <Icon iconType="icon-cancel" size="xs" />
          </Button>
        </Wrapper>
      ))}
      <Input
        placeholder={tags.length == 0 ? INPUT_VALIDATION.Tag.placeholder : ""}
        border="underline"
        className="!min-w-auto"
        isFull
        size="lg"
        value={tagInputValue}
        onChange={handleTagInputChange}
        onBlur={handleTagInputBlur}
        onKeyDown={handleTagInputKeyDown}
      />
    </Wrapper>
  );
};

export default TagInput;
