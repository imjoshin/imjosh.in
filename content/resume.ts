// Verified against Josh's signed-in LinkedIn profile on 2026-11-26:
// https://www.linkedin.com/in/imjoshin/
// https://www.linkedin.com/in/imjoshin/details/experience/
// Company and individual role dates, titles, and accomplishments come from that
// experience page. Copy is edited for brevity without adding responsibilities.
// Company websites were checked against their public homepages and, for Alpine,
// Josh's LinkedIn posts linking to alpine.inc.
export type ExperienceRole = {
  title: string;
  dates: string;
  summary?: string;
  highlights?: readonly string[];
};

export type Experience = {
  company: string;
  url: string;
  dates: string;
  roles: readonly ExperienceRole[];
  acquisition?: { company: string; year: number; url: string };
};

export const experience: readonly Experience[] = [
  {
    company: "Tern",
    url: "https://tern.travel/",
    dates: "Sep 2026 - now",
    // Current work is described in Josh's public announcement, rather than
    // inferred from the title. LinkedIn's experience entry has no description.
    // https://www.linkedin.com/posts/imjoshin_excited-to-share-that-im-joining-tern-as-activity-7501274728343719936-rkkd
    roles: [{
      title: "Senior Engineering Manager",
      dates: "Sep 2026 - now",
      summary: "Building connected systems and a delightful app for travel advisors. Bringing together third-party connections, supplier data, and real-time sync so advisors can book travel and run their business in one place.",
    }],
  },
  {
    company: "Alpine",
    url: "https://alpine.inc/",
    dates: "Apr 2025 - Sep 2026",
    roles: [{
      title: "Founding Engineer",
      dates: "Apr 2025 - Sep 2026",
      highlights: [
        "Delivered features from scoping and design through implementation, deployment, and observability.",
        "Cut CI runtime by about 90%, helping the team iterate faster.",
        "Established alerting and incident-response pipelines with PagerDuty and observability tooling.",
        "Built AI-assisted developer tooling that standardized how the team uses agents across its workflow.",
        "Planned and ran company offsites to align leadership and engineering on roadmap and launch priorities.",
      ],
    }],
  },
  {
    company: "Beeper",
    url: "https://www.beeper.com/",
    dates: "May 2023 - Oct 2024",
    roles: [{
      title: "Engineering Lead (Player/Coach)",
      dates: "May 2023 - Oct 2024",
      highlights: [
        "Led the desktop team as it grew from three to eight engineers and daily active users grew from 12,000 to 300,000.",
        "Managed engineers through weekly 1:1s, career development, and performance feedback, while planning projects and coordinating incident response.",
        "Built a Buildkite pipeline for macOS, Linux, and Windows, cutting desktop build times by 50% and enabling version rollbacks.",
        "Built search across messages, people, networks, and media; implemented native macOS and Windows integrations and media caching that reduced load times by up to 90%.",
        "Delivered the first cross-functional project with Automattic after the acquisition and helped shape the Beeper and Texts.com integration.",
      ],
    }],
    acquisition: {
      company: "Automattic",
      year: 2024,
      url: "https://blog.beeper.com/2024/04/09/beeper-is-joining-automattic/",
    },
  },
  {
    company: "Gatsby",
    url: "https://www.gatsbyjs.com/",
    dates: "Jan 2022 - May 2023",
    roles: [
      {
        title: "Product Manager, Netlify Builds and Ecosystem",
        dates: "Feb 2023 - May 2023",
        highlights: [
          "Led initial product-integration decisions for Gatsby and Netlify, and kicked off design and development of Gatsby Adapters for Zero Deploy on Netlify.",
        ],
      },
      {
        title: "Product Manager, Gatsby Cloud and Framework",
        dates: "Sep 2022 - Feb 2023",
        highlights: [
          "Shipped Gatsby 5 and led Sales and Support enablement for critical enterprise features.",
        ],
      },
      {
        title: "Staff Software Engineer",
        dates: "Jan 2022 - Sep 2022",
        highlights: [
          "Co-created the Slice API so shared pieces of a site could update independently and be stitched together at request time.",
          "Reduced Gatsby process memory usage by up to 30%, prototyped a new underlying bundler, and maintained the open-source project through reviews, triage, and community support.",
        ],
      },
    ],
    acquisition: {
      company: "Netlify",
      year: 2023,
      url: "https://www.netlify.com/press/netlify-acquires-gatsby-inc-to-accelerate-adoption-of-composable-web-architectures/",
    },
  },
  {
    company: "Duo Security",
    url: "https://duo.com/",
    dates: "Jan 2019 - Jan 2022",
    roles: [
      {
        title: "Design Engineer",
        dates: "Nov 2021 - Jan 2022",
        highlights: [
          "Designed the architecture for a single-page administration panel and refactored the data layer connecting backend services to the frontend.",
        ],
      },
      {
        title: "Software Engineer III",
        dates: "May 2020 - Nov 2021",
        highlights: [
          "Built Endpoint Health features in C#, Swift, React, and Python, and led service-architecture refactors for Windows and macOS.",
          "Established a cross-team working agreement and mentored the team's intern through regular 1:1s and career coaching.",
        ],
      },
      {
        title: "Software Engineer II",
        dates: "Jan 2019 - May 2020",
        highlights: [
          "Built admin features in Backbone.js, React, and Python. Led the User Sync UI refactor, introduced TypeScript, and implemented the first phase of a major backend refactor.",
        ],
      },
    ],
  },
  {
    company: "Barracuda",
    url: "https://www.barracuda.com/",
    dates: "Feb 2017 - Jan 2019",
    roles: [
      {
        title: "Software Engineer II",
        dates: "Jun 2017 - Jan 2019",
        highlights: [
          "Led development of the AWS Backup service, built log aggregation and search tools in Go, and helped redesign a major support pain point in the Backup product.",
        ],
      },
      {
        title: "Software Engineer I",
        dates: "Feb 2017 - May 2017",
        highlights: ["Implemented Backup product features in jQuery and PHP."],
      },
    ],
  },
] as const;

// Verified against the signed-in education page on 2026-11-26:
// https://www.linkedin.com/in/imjoshin/details/education/
// LinkedIn supplies Computer Science, 2013-2016, Mathematical Sciences, and
// cum laude. Josh explicitly identified the bachelor's degree as a BS in the
// redesign request on 2026-11-26. Location was supplied in the design handoff.
export const education = {
  school: "Michigan Technological University",
  url: "https://www.mtu.edu/",
  location: "Houghton, MI",
  dates: "2013 - 2016",
  degree: "B.S. in Computer Science",
  minor: "Mathematical Sciences",
  honors: "Cum laude",
};

// Exact excerpts verified against the received recommendations on 2026-11-26:
// https://www.linkedin.com/in/imjoshin/details/recommendations/
// Vitaliy: 2024-11-11; Annie: 2024-05-29. Context is summarized from the text
// and the stated working relationships, without copying current job titles.
export const recommendations = [
  {
    quote: "Josh combines deep technical skills with an empathetic, collaborative mindset.",
    author: "Vitaliy Peker",
    url: "https://www.linkedin.com/in/vitaliy-peker/",
    context: "Colleague at Barracuda, Duo, Gatsby & Netlify",
  },
  {
    quote: "Reporting to him, I constantly felt supported and encouraged in my role.",
    author: "Annie Elequin",
    url: "https://www.linkedin.com/in/annie-elequin/",
    context: "Reported directly to Josh",
  },
] as const;
