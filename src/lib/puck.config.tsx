import { Config } from "@puckeditor/core";
import HeroBanner from "@/components/storefront/HeroBanner";
import CategoryCarousel from "@/components/storefront/CategoryCarousel";
import ClassicGrid from "@/components/storefront/ClassicGrid";
import PromoGrid from "@/components/storefront/PromoGrid";
import { StorefrontBlock } from "@/lib/storefront";

type BaseProps = {
  title?: string;
  spacing?: 'none' | 'small' | 'medium' | 'large';
};

export type PuckComponents = {
  HeroBanner: BaseProps & {
    imageUrl: string;
    linkHref: string;
    aspectRatio?: 'auto' | 'square' | 'portrait' | 'video' | 'full';
  };
  CategoryCarousel: BaseProps & {
    autoplay?: "true" | "false"; // Workaround for simple select instead of boolean mapped later
    aspectRatio?: 'auto' | 'square' | 'portrait' | 'video' | 'full';
    items: Array<{ imageUrl: string; linkHref: string; title?: string }>;
  };
  ClassicGrid: BaseProps & {
    gridColumnsDesktop?: number;
    gridColumnsMobile?: number;
    aspectRatio?: 'auto' | 'square' | 'portrait' | 'video' | 'full';
    items: Array<{ imageUrl: string; linkHref: string; title?: string }>;
  };
  PromoGrid: BaseProps & {
    items: Array<{ imageUrl: string; linkHref: string; title?: string }>;
  };
};

export const puckConfig: Config<PuckComponents> = {
  components: {
    HeroBanner: {
      fields: {
        title: { type: "text" },
        imageUrl: { type: "text" },
        linkHref: { type: "text" },
        spacing: {
          type: "select",
          options: [
            { label: "None", value: "none" },
            { label: "Small", value: "small" },
            { label: "Medium", value: "medium" },
            { label: "Large", value: "large" },
          ],
        },
        aspectRatio: {
          type: "select",
          options: [
            { label: "Auto", value: "auto" },
            { label: "Square", value: "square" },
            { label: "Portrait", value: "portrait" },
            { label: "Video", value: "video" },
            { label: "Full Bleed", value: "full" },
          ],
        },
      },
      defaultProps: {
        title: "Hero Banner Title",
        imageUrl: "https://via.placeholder.com/1200x600",
        linkHref: "/",
        spacing: "medium",
        aspectRatio: "auto",
      },
      render: ({ puck, ...props }) => {
        return <HeroBanner block={{ type: "hero_banner", id: "puck-block", ...(props as any) }} />;
      },
    },
    CategoryCarousel: {
      fields: {
        title: { type: "text" },
        autoplay: { 
            type: "select", 
            options: [
                { label: "Yes", value: "true" }, 
                { label: "No", value: "false" }
            ] 
        },
        spacing: { type: "select", options: [ { label: "None", value: "none" }, { label: "Small", value: "small" }, { label: "Medium", value: "medium" }, { label: "Large", value: "large" } ] },
        aspectRatio: { type: "select", options: [ { label: "Auto", value: "auto" }, { label: "Square", value: "square" }, { label: "Portrait", value: "portrait" } ] },
        items: {
          type: "array",
          arrayFields: {
            title: { type: "text" },
            imageUrl: { type: "text" },
            linkHref: { type: "text" },
          },
        },
      },
      defaultProps: {
        title: "Carousel Categories",
        autoplay: "false",
        spacing: "medium",
        aspectRatio: "auto",
        items: [],
      },
      render: ({ puck, ...props }) => {
        const isAutoplay = props.autoplay === "true";
        return <CategoryCarousel block={{ type: "category_carousel", id: "puck-block", ...(props as any), autoplay: isAutoplay }} />;
      },
    },
    ClassicGrid: {
      fields: {
        title: { type: "text" },
        gridColumnsDesktop: { type: "number" },
        gridColumnsMobile: { type: "number" },
        spacing: { type: "select", options: [ { label: "None", value: "none" }, { label: "Small", value: "small" }, { label: "Medium", value: "medium" }, { label: "Large", value: "large" } ] },
        aspectRatio: { type: "select", options: [ { label: "Auto", value: "auto" }, { label: "Square", value: "square" }, { label: "Portrait", value: "portrait" } ] },
        items: {
          type: "array",
          arrayFields: {
            title: { type: "text" },
            imageUrl: { type: "text" },
            linkHref: { type: "text" },
          },
        },
      },
      defaultProps: {
        title: "Classic Grid",
        gridColumnsDesktop: 5,
        gridColumnsMobile: 2,
        spacing: "medium",
        aspectRatio: "auto",
        items: [],
      },
      render: ({ puck, ...props }) => {
        const gridColsCls = `grid-cols-${props.gridColumnsMobile || 2} md:grid-cols-${props.gridColumnsDesktop || 5}`;
        return <ClassicGrid block={{ type: "classic_grid", id: "puck-block", ...(props as any) }} gridColsCls={gridColsCls} />;
      },
    },
    PromoGrid: {
      fields: {
        title: { type: "text" },
        spacing: { type: "select", options: [ { label: "None", value: "none" }, { label: "Small", value: "small" }, { label: "Medium", value: "medium" }, { label: "Large", value: "large" } ] },
        items: {
           type: "array",
           arrayFields: {
             title: { type: "text" },
             imageUrl: { type: "text" },
             linkHref: { type: "text" },
           },
           // Optional enforcing min and max later depending on puck docs
        },
      },
      defaultProps: {
        title: "Promo Grid (Requires exactly 3 items)",
        spacing: "medium",
        items: [],
      },
      render: ({ puck, ...props }) => {
        return <PromoGrid block={{ type: "promo_grid", id: "puck-block", ...(props as any) }} />;
      },
    },
  },
};
