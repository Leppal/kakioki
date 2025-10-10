import type { DetailedHTMLProps, HTMLAttributes, CSSProperties } from "react";

export type LiteYouTubeAttributes = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
  videoid: string;
  playlabel?: string;
  params?: string;
  nocookie?: boolean;
  style?: CSSProperties;
};

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "lite-youtube": LiteYouTubeAttributes;
    }
  }
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "lite-youtube": LiteYouTubeAttributes;
    }
  }
}

export {};
