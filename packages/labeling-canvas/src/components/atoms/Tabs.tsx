import { useEffect, useState } from "react";

import type { UIType } from "@/types/ui-type.interface";

interface TabItem {
  name?: string;
  id?: string;
  indicator?: React.ReactNode;
  isDisabled?: boolean;
}

interface TabsType extends UIType<"sm" | "md" | "lg", string> {
  titles: TabItem[];
  isSwitch?: boolean;
  className?: string;
  onClick?: (item: TabItem) => void;
  selectedName?: string;
}

function Tabs({
  titles,
  size = "md",
  style = "primary",
  isSwitch,
  className,
  onClick,
  selectedName,
}: TabsType) {
  const initialSelectStates = new Array(titles.length).fill(false);
  initialSelectStates[0] = true;

  const titlesLength = titles.length;
  const isControlled = typeof selectedName === "string";
  const controlledIndex = isControlled
    ? titles.findIndex(
        (item) => item.name === selectedName || item.id === selectedName
      )
    : -1;

  const [selectStates, setSelectStates] = useState(initialSelectStates);

  useEffect(() => {
    if (typeof selectedName !== "string" || titles.length === 0) {
      return;
    }
    const selectedIndex = titles.findIndex(
      (item) => item.name === selectedName || item.id === selectedName
    );
    if (selectedIndex < 0) {
      return;
    }
    setSelectStates((prev) => {
      if (prev[selectedIndex]) {
        return prev;
      }
      const nextState = new Array(titles.length).fill(false);
      nextState[selectedIndex] = true;
      return nextState;
    });
  }, [selectedName, titles]);

  function handleSelectState(item: TabItem, idx: number) {
    if (!isControlled) {
      const newSelected = new Array(titles.length).fill(false);
      newSelected[idx] = true;
      setSelectStates(newSelected);
    }
    onClick?.(item);
  }

  return (
    <div className={`tabs-wrapper ${className}`}>
      <div
        className={`tabs tabs-${size} ${isSwitch ? "tabs-switch" : ""}`}
        data-style={style}
        style={{ gridTemplateColumns: `repeat(${titlesLength}, 1fr)` }}
      >
        {titles.map((item, idx) => {
          return (
            <button
              key={`${item.name}_${idx}`}
              className={`tab${
                (isControlled ? idx === controlledIndex : selectStates[idx])
                  ? " selected"
                  : ""
              }`}
              style={{ cursor: titles.length === 1 ? "default" : "pointer" }}
              onClick={() => handleSelectState(item, idx)}
              disabled={item.isDisabled}
            >
              {item.name && <p>{item.name}</p>}
              {item.indicator}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default Tabs;
