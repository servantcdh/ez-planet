import type { UIType } from "@/types/ui-type.interface";

interface TitleType extends UIType {
  title: string;
  subtitle?: string;
  indicator?: React.ReactNode;
}

function Title({ title, subtitle, size = "md", indicator }: TitleType) {
  return (
    <div className="title-wrapper">
      <div className={`title title-${size}`}>
        <h2>{title}</h2>
        {indicator}
      </div>
      {subtitle && <p className={`subtitle subtitle-${size}`}>{subtitle}</p>}
    </div>
  );
}

export default Title;
