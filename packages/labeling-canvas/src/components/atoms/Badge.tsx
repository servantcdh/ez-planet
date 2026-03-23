import type { UIType } from "@/types/ui-type.interface";

interface BagdeType extends UIType {
  title: string;
  style?:
    | "primary"
    | "secondary"
    | "accent"
    | "primary-light"
    | "secondary-light"
    | "accent-light"
    | "blue";
}

function Badge({ title, size = "md", style = "accent" }: BagdeType) {
  return (
    <div className={`badge badge-${size}`} data-style={style}>
      <p className="badge__title">{title}</p>
    </div>
  );
}

export default Badge;
