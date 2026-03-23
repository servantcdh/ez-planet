import Icon, { type IconName } from "./Icon";
import Image from "./Image";

interface FolderType {
  title: string;
  titleIcon?: IconName;
  indicator?: React.ReactNode;
  minItemsPerRow?: number;
  gap?: number;
  isHeaderEnabled?: boolean;
  isBordered?: boolean;
  isThumbnailEnabled?: boolean;
  thumbnailURLs?: string[];
  className?: string;
  children?: React.ReactNode;
  isSkeleton?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
}

function Folder({
  title,
  titleIcon,
  indicator,
  minItemsPerRow = 6,
  gap = 0.25,
  isHeaderEnabled = true,
  isBordered = false,
  isThumbnailEnabled = true,
  thumbnailURLs = [],
  className,
  children,
  isSkeleton,
  onClick,
  onDoubleClick,
}: FolderType) {
  const getThumbnailGridStyle = (count: number): React.CSSProperties => {
    if (count === 1) {
      return {
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "1fr 1fr",
        gridTemplateAreas: `
          "a a"
          "a a"
        `,
      };
    }
    if (count === 2) {
      return {
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "1fr 1fr",
        gridTemplateAreas: `
          "a b"
          "a b"
        `,
      };
    }
    if (count === 3) {
      return {
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "1fr 1fr",
        gridTemplateAreas: `
          "a b"
          "a c"
        `,
      };
    }
    if (count >= 4) {
      return {
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "1fr 1fr",
        gridTemplateAreas: `
          "a b"
          "c d"
        `,
      };
    }
    return {};
  };

  const thumbnailStyle = getThumbnailGridStyle(thumbnailURLs.length);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (isSkeleton) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onDoubleClick?.();
    }
  };

  const isInteractive = Boolean(onClick || onDoubleClick);

  return (
    <div
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={isInteractive ? handleKeyDown : undefined}
      className={`folder-wrapper folder-min-items-per-row-${minItemsPerRow} folder-gap-${gap} ${isBordered ? "bordered" : ""} ${className} ${isSkeleton ? "skeleton" : ""}`}
      style={{
        maxWidth: `calc((100% - (${minItemsPerRow} - 1) * ${gap}rem) / ${minItemsPerRow})`,
      }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      {!isSkeleton ? (
        <div className={`folder`}>
          {isHeaderEnabled && (
            <div className="folder-header">
              <svg
                width="112"
                height="24"
                viewBox="0 0 112 24"
                fill="white"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M0 8C0 3.58172 3.58172 0 8 0H84.1244C88.8048 0 93.2505 2.04937 96.2904 5.60823L112 24H0V8Z"
                  fill="white"
                />
              </svg>
            </div>
          )}

          <div className="folder-body">
            {isThumbnailEnabled && (
              <div className="folder-body__thumbnail" style={thumbnailStyle}>
                {thumbnailURLs.length > 0 ? (
                  thumbnailURLs.map((src, index) => (
                    <Image
                      key={`${src}_${index}`}
                      src={src}
                      alt={title}
                      fallback={
                        <Image
                          style={{
                            width: "80px",
                            height: "80px",
                            display: "inline-block",
                            margin: "auto",
                          }}
                          src="/icon-broken.svg"
                          alt="fallback"
                        />
                      }
                    />
                  ))
                ) : (
                  <Icon iconType="icon-files" />
                )}
              </div>
            )}

            <div className="folder-body__title">
              {titleIcon && (
                <div className="title-icon">
                  <Icon iconType={titleIcon} />
                </div>
              )}
              <p className="title">{title}</p>

              {indicator && <div className="indicator">{indicator}</div>}
            </div>
            {children && (
              <div className="folder-body__infomation">{children}</div>
            )}
          </div>
        </div>
      ) : (
        <div className={`folder`}>
          {isHeaderEnabled && (
            <div className="folder-header">
              <svg
                width="112"
                height="24"
                viewBox="0 0 112 24"
                fill="white"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M0 8C0 3.58172 3.58172 0 8 0H84.1244C88.8048 0 93.2505 2.04937 96.2904 5.60823L112 24H0V8Z"
                  fill="white"
                />
              </svg>
            </div>
          )}

          <div className="folder-body">
            {isThumbnailEnabled && (
              <div
                className="folder-body__thumbnail skeleton"
                style={thumbnailStyle}
              ></div>
            )}

            <div className="folder-body__title">
              <p className="title skeleton"></p>
            </div>
            {children && (
              <div className="folder-body__infomation skeleton"></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Folder;
