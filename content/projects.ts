import cardscoutPreview from "../public/projects/cardscout.jpg";
import dishinPreview from "../public/projects/dishin.jpg";
import oakPreview from "../public/projects/oak.jpg";

// Descriptions verified against each project's public homepage on 2026-11-25.
// Josh requested Building tags for Dishin and Oak on 2026-11-25.
export const projects = [
  {
    name: "CardScout",
    domain: "cardscout.co",
    url: "https://cardscout.co",
    description: "A clearer picture of the trading card market. Price history, market signals, and store listings help collectors research cards and find deals.",
    building: false,
    preview: cardscoutPreview,
    previewAlt: "CardScout homepage with its card market research introduction in teal on navy.",
  },
  {
    name: "Dishin",
    domain: "dishin.app",
    url: "https://dishin.app",
    description: "A home for every recipe worth keeping. Save recipes from links, scan handwritten cards, and organize your favorites into cookbooks you can share.",
    building: true,
    preview: dishinPreview,
    previewAlt: "Dishin homepage with its recipe collection introduction beside a pasta dinner.",
  },
  {
    name: "Oak Apparel",
    domain: "oakapparel.co",
    url: "https://oakapparel.co",
    description: "One-of-a-kind, AI-generated shirts, each printed only once. Prices fall every second until someone claims a design, then it is theirs alone.",
    building: true,
    preview: oakPreview,
    previewAlt: "Oak Apparel homepage introducing one-of-a-kind shirts that are never reprinted.",
  },
] as const;
