// ── Subtypes per category ────────────────────────────────────────────

type DesktopComputer = {
    category: "desktop";
    subtype: "computer";
    make: string;
    model: string;
    cpu: string;
    ram: string;
    gpu?: string;
    storage?: string;
    case?: string;
    cooling?: string;
    motherboard?: string;
    psu?: string;
    os?: string;
};

type DesktopMonitor = {
    category: "desktop";
    subtype: "monitor";
    make: string;
    model: string;
    size: string;
    resolution: string;
    panelType?: string;
    refreshRate?: string;
};

type DesktopKeyboard = {
    category: "desktop";
    subtype: "keyboard";
    make: string;
    model: string;
};

type DesktopMouse = {
    category: "desktop";
    subtype: "mouse";
    make: string;
    model: string;
};

type DesktopPeripheral = {
    category: "desktop";
    subtype: "peripheral";
    make: string;
    model: string;
    description?: string;
};

type Laptop = {
    category: "laptop";
    subtype: "laptop";
    make: string;
    model: string;
    cpu: string;
    ram: string;
    gpu?: string;
    storage?: string;
    display?: string;
    os?: string;
};

type CameraBody = {
    category: "camera";
    subtype: "body";
    make: string;
    model: string;
};

type CameraLens = {
    category: "camera";
    subtype: "lens";
    make: string;
    model: string;
    focalLength: string;
    maxAperture: string;
};

type Phone = {
    category: "phone";
    subtype: "phone";
    make: string;
    model: string;
    storage?: string;
    display?: string;
    os?: string;
};

type DeskItem = {
    category: "desk";
    subtype: "desk" | "chair" | "webcam" | "lighting" | "mount" | "mat" | "switch" | "mixer";
    make: string;
    model: string;
    description: string;
};

type AudioItem = {
    category: "audio";
    subtype: "headphones" | "earbuds";
    make: string;
    model: string;
    description: string;
};

type Microphone = {
    category: "microphone";
    subtype: "microphone";
    make: string;
    model: string;
    description: string;
};

type Console = {
    category: "console";
    subtype: "home" | "portable" | "hybrid";
    make: string;
    model: string;
    description: string;
};

// ── Active / retired status ──────────────────────────────────────────

type Active = { active: true };
type Retired = { active: false; doneDate: string };

// ── Public type ──────────────────────────────────────────────────────

export type UsesItem = (
    | DesktopComputer
    | DesktopMonitor
    | DesktopKeyboard
    | DesktopMouse
    | DesktopPeripheral
    | Laptop
    | CameraBody
    | CameraLens
    | Phone
    | DeskItem
    | AudioItem
    | Microphone
    | Console
) &
    (Active | Retired) & {
        producer: string;
        releaseYear: number | null;
        image: { src: string; alt: string; sourceUrl: string; note?: string; credit?: { label: string; url: string; license: string; licenseUrl: string }; backgroundRemoved?: boolean; colorAdjusted?: boolean };
        modelApproximate?: boolean;
        specs: Record<string, string>;
        sources: { label: string; url: string }[];
        acquireDate: string;
        notes?: string;
    };

export type Category = UsesItem["category"];

// Product details use manufacturer references. Original ownership records remain authoritative.
// Custom builds have no commercial release year; the prebuilt release year is unconfirmed.
// Image provenance is stored per item. Manufacturer photos illustrate the model, not the owned unit.

// ── Data ─────────────────────────────────────────────────────────────

export const usesItems: UsesItem[] = [
    // ── Desktop ──────────────────────────────────────────────────────
    // Josh's recollection, supplied 2026-11-27. He requested real period models as
    // approximate references because the exact models and acquisition month are unknown.
    {
        category: "desktop",
        subtype: "computer",
        make: "Dell",
        model: "Dimension 2400",
        modelApproximate: true,
        cpu: "Intel Pentium 4",
        ram: "256MB RAM",
        producer: "Dell",
        releaseYear: 2003,
        image: {
            src: "/gear/dell-dimension-2400.jpg",
            alt: "Dell Dimension 2400 tower, an approximate reference for the remembered desktop",
            sourceUrl: "https://static-data2.manualslib.com/product-images/981/227494/dell-dimension-2400-series-desktop.jpg",
        },
        specs: {
            "Processor": "Intel Pentium 4",
            "Memory": "256MB RAM",
            "Form factor": "Tower",
            "Model identification": "Approximate period reference",
        },
        sources: [
            { label: "Dell Dimension 2400 owner’s manual", url: "https://andovercg.com/datasheets/dell-dimension-2400-series.pdf" },
            { label: "Dell setup guide, August 2003", url: "https://dl.dell.com/manuals/all-products/esuprt_desktop/esuprt_dimension_desktops/dimension-2400_setup%20guide_zh-cn.pdf" },
        ],
        acquireDate: "2008",
        active: false,
        doneDate: "2013-09",
    },
    {
        category: "desktop",
        subtype: "monitor",
        make: "Dell",
        model: 'E773c 17" CRT',
        modelApproximate: true,
        size: '17" (16" viewable)',
        resolution: "1024 × 768",
        panelType: "CRT",
        refreshRate: "85Hz",
        producer: "Dell",
        releaseYear: null,
        image: {
            src: "/gear/dell-e773c.jpg",
            alt: "Dell E773c CRT monitor, an approximate reference for the remembered monitor",
            sourceUrl: "https://crtdatabase.com/images/d/c/d/d/6/dcdd698968c3b098ec931cc41b03c7bd1973a025-dell-e773c-1.jpg",
            credit: {
                label: "Matt Ross / CRT Database",
                url: "https://crtdatabase.com/crts/dell/dell-e773c",
                license: "CC BY-NC-SA 4.0",
                licenseUrl: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
            },
        },
        specs: {
            "Screen size": '17" (16" viewable)',
            "Resolution": "1024 × 768",
            "Panel": "CRT",
            "Refresh rate": "85Hz",
            "Display mode": "1024 × 768 at 85Hz is a supported preset",
            "Input": "VGA (15-pin D-sub)",
            "Dot pitch": "0.27mm",
        },
        sources: [
            { label: "Dell E773c service manual, May 2005", url: "https://manualzz.com/doc/24500523/dell-e773c-color-monitor-service-manual" },
            { label: "Dell E773c environmental datasheet", url: "https://i.dell.com/sites/doccontent/shared-content/solutions/en/Documents/disp_e773c_lf_us.pdf" },
        ],
        acquireDate: "2008",
        active: false,
        doneDate: "2013-09",
    },
    {
        category: "desktop",
        subtype: "keyboard",
        make: "Dell",
        model: "SK-8115",
        modelApproximate: true,
        producer: "Dell",
        releaseYear: null,
        image: {
            src: "/gear/dell-sk8115.jpg",
            alt: "Dell SK-8115 USB keyboard, an approximate reference for the remembered keyboard",
            sourceUrl: "https://www.geekabit.nl/projects/building-a-keyboard-from-scratch/images/400/dell-sk-8115-keyboard.jpg",
        },
        specs: {
            "Layout": "Full size with number pad",
            "Connection": "USB",
            "Type": "Wired keyboard",
            "Model identification": "Approximate period reference",
        },
        sources: [
            { label: "Dell keyboard accessibility documentation", url: "https://i.dell.com/sites/csdocuments/Legal_Docs/en/dell-vpat-list-ver03.pdf" },
            { label: "Dell SK-8115 discussion, November 2006", url: "https://www.dell.com/community/en/conversations/locked-topics-desktops-general/keyboard-model-sk-8115/647e777df4ccf8a8de2e6a5e" },
        ],
        acquireDate: "2008",
        active: false,
        doneDate: "2013-09",
        notes: "USB · Full size",
    },
    {
        category: "desktop",
        subtype: "mouse",
        make: "Dell",
        model: "M-UVDEL1",
        modelApproximate: true,
        producer: "Dell",
        releaseYear: null,
        image: {
            src: "/gear/dell-m-uvdel1.png",
            alt: "Dell M-UVDEL1 optical USB mouse, an approximate reference for the remembered mouse",
            sourceUrl: "https://i.ebayimg.com/images/g/I1AAAOSwfwJmhNtl/s-l500.png",
        },
        specs: {
            "Sensor": "Optical",
            "Connection": "USB",
            "Type": "Wired mouse",
            "Controls": "Two buttons and scroll wheel",
        },
        sources: [
            { label: "Dell M-UVDEL1 product and photo reference", url: "https://www.ebay.com/itm/296542681354" },
            { label: "Dell optical wheel mouse discussion, May 2004", url: "https://www.dell.com/community/en/conversations/locked-topics-desktops-general/driver-for-optical-dell-wheel-mouse/647e44e6f4ccf8a8de0ead49" },
            { label: "2004 asset inventory listing the M-UVDEL1", url: "https://www.sec.gov/Archives/edgar/data/35733/000003573304000002/exhibit-10_1.txt" },
        ],
        acquireDate: "2008",
        active: false,
        doneDate: "2013-09",
        notes: "USB · Optical",
    },
    {
        category: "desktop",
        subtype: "computer",
        make: "Custom",
        model: "i7-4790K / GTX 970 Build",
        cpu: "Intel Core i7-4790K 4 GHz Quad-Core",
        ram: "16GB DDR3-1600 (G.Skill Ares)",
        gpu: "MSI GeForce GTX 970 4GB",
        storage: "Crucial BX100 250GB SSD",
        case: "NZXT H440",
        cooling: "Cooler Master Hyper 212 EVO",
        motherboard: "MSI Z97-GAMING 7",
        psu: "EVGA SuperNOVA 850 G2 850W",
        os: "Windows 10",
        "producer": "Custom build",
        "releaseYear": null,
        "image": {
            "src": "/gear/custom-h440-white.png",
            "alt": "White NZXT H440 case",
            "note": "White NZXT H440 case shown. Custom configuration listed below.",
            "sourceUrl": "https://www.pngkit.com/png/full/316-3161597_nzxt-h440-white-mid-tower-computer-case-nzxt.png"
        },
        "specs": {
            "Processor": "Intel Core i7-4790K 4 GHz Quad-Core",
            "Graphics": "MSI GeForce GTX 970 4GB",
            "Memory": "16GB DDR3-1600 (G.Skill Ares)",
            "Storage": "Crucial BX100 250GB SSD",
            "Case": "NZXT H440",
            "Case color": "White",
            "Cooling": "Cooler Master Hyper 212 EVO",
            "Motherboard": "MSI Z97-GAMING 7",
            "Power supply": "EVGA SuperNOVA 850 G2 850W",
            "Operating system": "Windows 10"
        },
        "sources": [
            {
                "label": "Manufacturer product information",
                "url": "https://assets.cdn.nzxt.com/uploads/download/attachment/245/H-440-manual-multi-language.pdf"
            }
        ],
        acquireDate: "2015-10",
        active: false,
        doneDate: "2020-04",
    },
    {
        category: "desktop",
        subtype: "computer",
        make: "Custom",
        model: "Ryzen 7 3700X / RTX 2070S Build",
        cpu: "AMD Ryzen 7 3700X 3.6 GHz 8-Core",
        ram: "64GB DDR4-3600 (G.Skill Trident Z Neo)",
        gpu: "EVGA GeForce RTX 2070 SUPER 8GB",
        storage: "Samsung 970 Evo 500GB NVMe + WD Gold 4TB HDD",
        case: "Corsair iCUE 220T RGB Airflow",
        cooling: "Cooler Master Hyper 212 RGB Black Edition",
        motherboard: "MSI MPG X570 GAMING PRO CARBON WIFI",
        psu: "Silverstone SFX 500W",
        os: "Windows 10",
        "producer": "Custom build",
        "releaseYear": null,
        "image": {
            "src": "/gear/custom-220t.png",
            "alt": "Corsair iCUE 220T RGB Airflow product view",
            "note": "Corsair iCUE 220T case shown. Custom configuration listed below.",
            "sourceUrl": "https://res.cloudinary.com/corsair-pwa/image/upload/c_scale,q_auto,w_800/products/Cases/CC-9011173-WW/Gallery/220T_RGB_BLACK_01.png"
        },
        "specs": {
            "Processor": "AMD Ryzen 7 3700X 3.6 GHz 8-Core",
            "Graphics": "EVGA GeForce RTX 2070 SUPER 8GB",
            "Memory": "64GB DDR4-3600 (G.Skill Trident Z Neo)",
            "Storage": "Samsung 970 Evo 500GB NVMe + WD Gold 4TB HDD",
            "Case": "Corsair iCUE 220T RGB Airflow",
            "Cooling": "Cooler Master Hyper 212 RGB Black Edition",
            "Motherboard": "MSI MPG X570 GAMING PRO CARBON WIFI",
            "Power supply": "Silverstone SFX 500W",
            "Operating system": "Windows 10"
        },
        "sources": [
            {
                "label": "Manufacturer product information",
                "url": "https://www.corsair.com/us/en/p/pc-cases/cc-9011173-ww/icue-220t-rgb-airflow-tempered-glass-mid-tower-smart-case-black-cc-9011173-ww"
            }
        ],
        acquireDate: "2020-04",
        active: false,
        doneDate: "2026-04",
    },
    {
        category: "desktop",
        subtype: "computer",
        make: "iBUYPOWER",
        model: "RDY KING 95 PRO 009",
        cpu: "Intel Core i9-14900KF (8x 3.20GHz + 16x 2.40GHz)",
        ram: "64GB DDR5-6000MHz",
        gpu: "GeForce RTX 5080 16GB GDDR7",
        storage: "4TB M.2 NVMe Gen4 SSD",
        case: "Montech King 95 Pro",
        cooling: "360mm AIO Liquid Cooling",
        motherboard: "MSI PRO Z790-P WiFi",
        psu: "850W Corsair RM850e",
        os: "Windows 11",
        "producer": "iBUYPOWER",
        "releaseYear": null,
        "image": {
            "src": "/gear/ibuypower-king95.png",
            "alt": "iBUYPOWER RDY KING 95 PRO 009 product view",
            "sourceUrl": "https://content.ibuypower.com/cdn-cgi/image/width%3D3840%2Cformat%3Dauto%2Cquality%3D85/https%3A/content.ibuypower.com/Images/Components/31681/RDY-KING-PRO-009-01-Hero-400.png?v=a6957bb4a77a20bcd67d06d2cec8fa64b441ac55"
        },
        "specs": {
            "Processor": "Intel Core i9-14900KF (8x 3.20GHz + 16x 2.40GHz)",
            "Graphics": "GeForce RTX 5080 16GB GDDR7",
            "Memory": "64GB DDR5-6000MHz",
            "Storage": "4TB M.2 NVMe Gen4 SSD",
            "Case": "Montech King 95 Pro",
            "Cooling": "360mm AIO Liquid Cooling",
            "Motherboard": "MSI PRO Z790-P WiFi",
            "Power supply": "850W Corsair RM850e",
            "Operating system": "Windows 11"
        },
        "sources": [
            {
                "label": "Manufacturer product information",
                "url": "https://www.ibuypower.com/gaming-pcs/prebuilt-gaming-pcs"
            }
        ],
        acquireDate: "2026-04",
        active: true,
    },
    {
        category: "desktop",
        subtype: "monitor",
        make: "ASUS",
        model: 'VG248QE 24"',
        size: '24"',
        resolution: "1920x1080",
        panelType: "TN",
        refreshRate: "144Hz",
        "producer": "ASUS",
        "releaseYear": 2013,
        "image": {
            "src": "/gear/asus-vg248qe.png",
            "alt": "ASUS VG248QE 24\" product view",
            "sourceUrl": "https://www.asus.com/media/PT/products/2HXZjR1YHYisBKrM/P_setting_xxx_0_90_end_692.png"
        },
        "specs": {
            "Screen size": "24\"",
            "Resolution": "1920x1080",
            "Panel": "TN",
            "Refresh rate": "144Hz",
            "Response time": "1ms (GTG)",
            "Inputs": "DisplayPort, dual-link DVI-D, HDMI",
            "Stand": "Height, tilt, swivel and pivot"
        },
        "sources": [
            {
                "label": "Manufacturer product information",
                "url": "https://www.asus.com/displays-desktops/monitors/gaming/vg248qe/"
            }
        ],
        acquireDate: "2015-09",
        active: false,
        doneDate: "2021-12",
    },
    {
        category: "desktop",
        subtype: "monitor",
        make: "LG",
        model: '29UM67 29"',
        size: '29"',
        resolution: "2560x1080",
        panelType: "IPS",
        "producer": "LG",
        "releaseYear": 2015,
        "image": {
            "src": "/gear/lg-29um67.png",
            "alt": "LG 29UM67 29\" product view",
            "sourceUrl": "https://www.lg.com/content/dam/channel/wcms/jp/images/monitor/29um67-p/gallery/hd_001.jpg",
            "backgroundRemoved": true
        },
        "specs": {
            "Screen size": "29\"",
            "Resolution": "2560x1080",
            "Panel": "IPS",
            "Aspect ratio": "21:9",
            "Response time": "5ms (GTG)",
            "Inputs": "2 × HDMI, DVI-D, DisplayPort",
            "Speakers": "2 × 5W"
        },
        "sources": [
            {
                "label": "Manufacturer product information",
                "url": "https://www.lg.com/content/dam/channel/wcms/au/support/products/documents/29UM67_Tech_Spec_5_May.pdf"
            }
        ],
        acquireDate: "2015-09",
        active: false,
        doneDate: "2023-03",
    },
    {
        category: "desktop",
        subtype: "monitor",
        make: "MSI",
        model: 'Optix G27CQ4 27"',
        size: '27"',
        resolution: "2560x1440",
        refreshRate: "165Hz",
        "producer": "MSI",
        "releaseYear": 2019,
        "image": {
            "src": "/gear/msi-g27cq4.webp",
            "alt": "MSI Optix G27CQ4 27\" product view",
            "sourceUrl": "https://storage-asset.msi.com/global/picture/product/product_4_20190820091455_5d5bba0fa82f3.webp"
        },
        "specs": {
            "Screen size": "27\"",
            "Resolution": "2560x1440",
            "Refresh rate": "165Hz",
            "Panel": "VA",
            "Curvature": "1500R",
            "Response time": "1ms (MPRT)",
            "Inputs": "DisplayPort 1.2a, 2 × HDMI 2.0b"
        },
        "sources": [
            {
                "label": "Manufacturer product information",
                "url": "https://www.msi.com/Monitor/Optix-G27CQ4/Specification"
            }
        ],
        acquireDate: "2021-12",
        active: false,
        doneDate: "2024-09",
    },
    {
        category: "desktop",
        subtype: "monitor",
        make: "LG",
        model: 'UltraGear 34GP63A-B 34"',
        size: '34"',
        resolution: "2560x1440",
        panelType: "VA",
        refreshRate: "160Hz",
        "producer": "LG",
        "releaseYear": 2022,
        "image": {
            "src": "/gear/lg-34gp63a.png",
            "alt": "LG UltraGear 34GP63A-B 34\" product view",
            "sourceUrl": "https://www.lg.com/content/dam/channel/wcms/ca_en/images/monitors/34gp63a-b_aus_enci_ca_en_c/gallery/MZ-01.jpg?w=800",
            "backgroundRemoved": true
        },
        "specs": {
            "Screen size": "34\"",
            "Resolution": "2560x1440",
            "Panel": "VA",
            "Refresh rate": "160Hz",
            "Curvature": "1800R",
            "Response time": "5ms (GTG)",
            "Adaptive sync": "AMD FreeSync Premium",
            "Stand": "Tilt and height adjustment"
        },
        "sources": [
            {
                "label": "Manufacturer product information",
                "url": "https://www.lg.com/ca_en/monitors/gaming/34gp63a-b/"
            }
        ],
        acquireDate: "2023-03",
        active: false,
        doneDate: "2024-09",
    },
    {
        category: "desktop",
        subtype: "monitor",
        make: "ASUS",
        model: 'ROG Swift PG34WCDM 34"',
        size: '34"',
        resolution: "3440x1440",
        panelType: "OLED",
        refreshRate: "240Hz",
        "producer": "ASUS",
        "releaseYear": 2024,
        "image": {
            "src": "/gear/asus-pg34wcdm.webp",
            "alt": "ASUS ROG Swift PG34WCDM 34\" product view",
            "sourceUrl": "https://dlcdnwebimgs.asus.com/gain/D215A157-ABB4-4D8B-B869-ADEEFB7237DA/w800/fwebp"
        },
        "specs": {
            "Screen size": "34\"",
            "Resolution": "3440x1440",
            "Panel": "OLED",
            "Refresh rate": "240Hz",
            "Curvature": "800R",
            "Response time": "0.03ms (GTG)",
            "HDR": "DisplayHDR 400 True Black",
            "USB-C power": "90W",
            "KVM": "ROG Smart KVM"
        },
        "sources": [
            {
                "label": "Manufacturer product information",
                "url": "https://rog.asus.com/monitors/32-to-34-inches/rog-swift-oled-pg34wcdm/"
            }
        ],
        acquireDate: "2024-09",
        active: false,
        doneDate: "2026-01-19",
        notes: "Primary monitor",
    },
    // Additions approved by Josh on 2026-11-27. Amazon order dates use Eastern time.
    // Both 27QN600 purchases are retained as separate displays in the history.
    {
        category: "desktop",
        subtype: "monitor",
        make: "LG",
        model: '27QN600-B 27"',
        size: '27"',
        resolution: "2560 × 1440",
        panelType: "IPS",
        refreshRate: "75Hz",
        producer: "LG",
        releaseYear: null,
        image: {
            src: "/gear/lg-27qn600.jpg",
            alt: "LG 27QN600-B 27-inch monitor product view",
            sourceUrl: "https://media.us.lg.com/transform/ecomm-PDPGallery-1100x730/e0267711-2aea-4268-a57e-f3eee2123cbc/md07510383-zoom-01-jpg",
        },
        specs: {
            "Screen size": '27"',
            "Resolution": "2560 × 1440",
            "Panel": "IPS",
            "Refresh rate": "75Hz",
            "Color gamut": "sRGB 99%",
            "HDR": "HDR10",
            "Adaptive sync": "AMD FreeSync",
        },
        sources: [{ label: "Manufacturer product information", url: "https://www.lg.com/us/monitors/lg-27qn600-b-led-monitor" }],
        acquireDate: "2021-12-12",
        active: false,
        doneDate: "2026-01-19",
    },
    {
        category: "desktop",
        subtype: "monitor",
        make: "LG",
        model: '27QN600-B 27"',
        size: '27"',
        resolution: "2560 × 1440",
        panelType: "IPS",
        refreshRate: "75Hz",
        producer: "LG",
        releaseYear: null,
        image: {
            src: "/gear/lg-27qn600.jpg",
            alt: "LG 27QN600-B 27-inch monitor product view",
            sourceUrl: "https://media.us.lg.com/transform/ecomm-PDPGallery-1100x730/e0267711-2aea-4268-a57e-f3eee2123cbc/md07510383-zoom-01-jpg",
        },
        specs: {
            "Screen size": '27"',
            "Resolution": "2560 × 1440",
            "Panel": "IPS",
            "Refresh rate": "75Hz",
            "Color gamut": "sRGB 99%",
            "HDR": "HDR10",
            "Adaptive sync": "AMD FreeSync",
        },
        sources: [{ label: "Manufacturer product information", url: "https://www.lg.com/us/monitors/lg-27qn600-b-led-monitor" }],
        acquireDate: "2023-03-06",
        active: false,
        doneDate: "2026-01-19",
        notes: "Additional display",
    },
    {
        category: "desktop",
        subtype: "monitor",
        make: "Upperizon",
        model: '16" QHD Portable Monitor',
        size: '16"',
        resolution: "2560 × 1600",
        refreshRate: "120Hz",
        producer: "Upperizon",
        releaseYear: null,
        image: {
            src: "/gear/upperizon-16.jpg",
            alt: "Upperizon 16-inch portable monitor product view",
            sourceUrl: "https://m.media-amazon.com/images/I/71mY2sxfYCL._AC_SL1500_.jpg",
        },
        specs: {
            "Screen size": '16"',
            "Resolution": "2560 × 1600",
            "Refresh rate": "120Hz",
            "Aspect ratio": "16:10",
            "Color gamut": "100% sRGB",
            "Color depth": "10-bit",
            "Brightness": "400 nits",
            "Mounting": "VESA compatible",
        },
        sources: [{ label: "Product information", url: "https://www.amazon.com/dp/B0DT44HPT3" }],
        acquireDate: "2025-07-10",
        active: true,
        notes: "Portable display",
    },
    {
        category: "desktop",
        subtype: "monitor",
        make: "Samsung",
        model: 'Odyssey G9 G95C 49"',
        size: '49"',
        resolution: "5120 × 1440",
        panelType: "VA",
        refreshRate: "240Hz",
        producer: "Samsung",
        releaseYear: null,
        image: {
            src: "/gear/samsung-g95c.jpg",
            alt: "Samsung Odyssey G9 G95C 49-inch curved monitor product view",
            sourceUrl: "https://images.samsung.com/is/image/samsung/p6pim/us/ls49cg954enxza/gallery/us-gaming-ls49cg954enxza----inch-odyssey-g--g--c-black-552032404?$product-details-jpg$",
        },
        specs: {
            "Screen size": '49"',
            "Resolution": "5120 × 1440",
            "Panel": "VA",
            "Refresh rate": "240Hz",
            "Aspect ratio": "32:9",
            "Curvature": "1000R",
            "HDR": "VESA DisplayHDR 1000",
            "Adaptive sync": "AMD FreeSync Premium Pro",
        },
        sources: [{ label: "Manufacturer product information", url: "https://www.samsung.com/us/monitors/gaming/49-inch-odyssey-g9-dqhd-240hz-1ms-gtg-displayhdr-1000-gaming-monitor-sku-ls49cg954enxza/" }],
        acquireDate: "2026-01-19",
        active: true,
    },
    {
        category: "desktop",
        subtype: "monitor",
        make: "LG",
        model: 'UltraGear 34G600A-B 34"',
        size: '34"',
        resolution: "3440 × 1440",
        panelType: "VA",
        refreshRate: "160Hz",
        producer: "LG",
        releaseYear: 2025,
        image: {
            src: "/gear/lg-34g600a.jpg",
            alt: "LG UltraGear 34G600A-B 34-inch curved monitor product view",
            sourceUrl: "https://www.lg.com/content/dam/channel/wcms/uk/monitor/gaming/34g600a-b/gallery/ultragear-gaming-34g600a-2025-gallery-basic-01.jpg",
        },
        specs: {
            "Screen size": '34"',
            "Resolution": "3440 × 1440",
            "Panel": "VA",
            "Refresh rate": "160Hz",
            "Aspect ratio": "21:9",
            "Curvature": "1800R",
            "HDR": "HDR10",
            "Adaptive sync": "AMD FreeSync Premium",
            "Speakers": "2 × 5W",
        },
        sources: [{ label: "Manufacturer product information", url: "https://www.lg.com/uk/monitors/gaming/34g600a-b/" }],
        acquireDate: "2026-01-19",
        active: true,
    },
    // Keyboards
    {
        category: "desktop",
        subtype: "keyboard",
        make: "Corsair",
        model: "STRAFE RGB (Cherry MX Brown)",
        "producer": "Corsair",
        "releaseYear": 2015,
        "image": {
            "src": "/gear/corsair-strafe.png",
            "alt": "Corsair STRAFE RGB (Cherry MX Brown) product view",
            "sourceUrl": "https://www.eventus.si/iimg/9040/i.png"
        },
        "specs": {
            "Switches": "Cherry MX Brown",
            "Connection": "Wired USB",
            "Backlighting": "Per-key RGB",
            "USB passthrough": "Yes",
            "Layout": "Full-size"
        },
        "sources": [
            {
                "label": "Manufacturer product information",
                "url": "https://www.corsair.com/us/en/p/keyboards/CH-9000094-NA/strafe-rgb-mechanical-gaming-keyboard-a-cherrya-mx-brown-ch-9000094-na"
            }
        ],
        acquireDate: "2018-04",
        active: false,
        doneDate: "2020-12",
    },
    {
        category: "desktop",
        subtype: "keyboard",
        make: "FILCO",
        model: "Majestouch Convertible 2 (Cherry MX Brown)",
        "producer": "FILCO",
        "releaseYear": 2014,
        "image": {
            "src": "/gear/filco-convertible2.png",
            "alt": "FILCO Majestouch Convertible 2 (Cherry MX Brown) product view",
            "sourceUrl": "https://www.envisimple.com/images/product/L/300661025244668638.png"
        },
        "specs": {
            "Switches": "Cherry MX Brown",
            "Connection": "Bluetooth 3.0 and USB",
            "Bluetooth devices": "Up to 4 paired devices",
            "Power": "2 × AA batteries or USB",
            "Layout": "Full-size"
        },
        "sources": [
            {
                "label": "Manufacturer product information",
                "url": "https://kyodonewsprwire.jp/release/201412026005"
            }
        ],
        acquireDate: "2020-12",
        active: false,
        doneDate: "2023-03",
    },
    {
        category: "desktop",
        subtype: "keyboard",
        make: "Logitech",
        model: "G613 LIGHTSPEED Wireless",
        "producer": "Logitech",
        "releaseYear": 2017,
        "image": {
            "src": "/gear/logitech-g613.png",
            "alt": "Logitech G613 LIGHTSPEED Wireless product view",
            "sourceUrl": "https://logitech.onlinesalestore.pk/cdn/shop/files/logitech-g613-keyboard-02-logitech-pakistan.png?v=1691654156"
        },
        "specs": {
            "Switches": "Romer-G tactile",
            "Connection": "LIGHTSPEED wireless and Bluetooth",
            "Programmable keys": "6 G-keys",
            "Power": "2 × AA batteries",
            "Layout": "Full-size"
        },
        "sources": [
            {
                "label": "Manufacturer product information",
                "url": "https://press.logitech.eu/en-gb/logitech-g-unveils-new-lightspeedtm-wireless-mechanical-keyboard-and-next-generation-wireless-gaming-mouse/"
            }
        ],
        acquireDate: "2023-03",
        active: true,
    },

    // Mice
    {
        category: "desktop",
        subtype: "mouse",
        make: "Razer",
        model: "Naga 2014 MMO",
        "producer": "Razer",
        "releaseYear": 2013,
        "image": {
            "src": "/gear/razer-naga2014.png",
            "alt": "Razer Naga 2014 MMO product view",
            "sourceUrl": "https://dl.razerzone.com/src/2584-1-en-v1.png"
        },
        "specs": {
            "Sensor": "8,200 DPI 4G laser",
            "Thumb buttons": "12 mechanical buttons",
            "Connection": "Wired USB",
            "Scroll wheel": "Tilt-click",
            "Lighting": "Green"
        },
        "sources": [
            {
                "label": "Manufacturer product information",
                "url": "https://dl.razerzone.com/master-guides/Naga2014/Naga2014OMG-ENG.pdf"
            }
        ],
        acquireDate: "2014-10",
        active: false,
        doneDate: "2018-05",
    },
    {
        category: "desktop",
        subtype: "mouse",
        make: "Razer",
        model: "Naga Chroma",
        "producer": "Razer",
        "releaseYear": 2015,
        "image": {
            "src": "/gear/razer-nagachroma.png",
            "alt": "Razer Naga Chroma product view",
            "sourceUrl": "https://assets.razerzone.com/press/naga-chroma/razer-naga-chroma.png"
        },
        "specs": {
            "Sensor": "16,000 DPI 5G laser",
            "Programmable buttons": "19",
            "Thumb buttons": "12 mechanical buttons",
            "Connection": "Wired USB",
            "Lighting": "Razer Chroma RGB"
        },
        "sources": [
            {
                "label": "Manufacturer product information",
                "url": "https://www.razer.com/newsroom/product-news/razer-upgrades-worlds-best-mmo-gaming-mouse-with-state-of-the-art-sensor-and-chroma-rgb-lighting"
            }
        ],
        acquireDate: "2018-05",
        active: false,
        doneDate: "2020-12",
    },
    {
        category: "desktop",
        subtype: "mouse",
        make: "Razer",
        model: "Mamba Wireless",
        "producer": "Razer",
        "releaseYear": 2018,
        "image": {
            "src": "/gear/razer-mamba.png",
            "alt": "Razer Mamba Wireless product view",
            "sourceUrl": "https://press.razer.com/wp-content/uploads/2018/08/Mamba-Wireless.png",
            "backgroundRemoved": true
        },
        "specs": {
            "Sensor": "16,000 DPI optical",
            "Connection": "Wireless and wired USB",
            "Programmable buttons": "7",
            "Battery life": "Up to 50 hours",
            "Lighting": "Razer Chroma RGB"
        },
        "sources": [
            {
                "label": "Manufacturer product information",
                "url": "https://www.razer.com/newsroom/product-news/razer-raises-the-level-cap-with-best-in-class-peripherals-kraken-tournament-edition-blackwidow-elite-mamba-wireless"
            }
        ],
        acquireDate: "2020-12",
        active: false,
        doneDate: "2024-08",
    },
    {
        category: "desktop",
        subtype: "mouse",
        make: "Logitech",
        model: "MX Master 3S",
        "producer": "Logitech",
        "releaseYear": 2022,
        "image": {
            "src": "/gear/logitech-mx3s-black.png",
            "alt": "Black Logitech MX Master 3S product view",
            "sourceUrl": "https://resource.logitech.com/c_fill,q_auto,f_auto,dpr_1.0/d_transparent.gif/content/dam/logitech/en/products/mice/mx-master-3s/2025-update/mx-master-3s-bluetooth-edition-left-front-view-black-new-8.png"
        },
        "specs": {
            "Sensor": "8,000 DPI Darkfield",
            "Connection": "Bluetooth LE and Logi Bolt",
            "Scrolling": "MagSpeed electromagnetic wheel",
            "Charging": "USB-C",
            "Battery life": "Up to 70 days",
            "Color": "Black"
        },
        "sources": [
            {
                "label": "Manufacturer product information",
                "url": "https://www.logitech.com/en-us/products/mice/mx-master-3s.html"
            }
        ],
        acquireDate: "2024-08",
        active: true,
    },

    // ── Laptop ───────────────────────────────────────────────────────
    {
        category: "laptop",
        subtype: "laptop",
        make: "MSI",
        model: "GE60 0ND-257US",
        cpu: "Intel Core i7-3630QM 2.4GHz",
        ram: "24GB DDR3 (8GB + 16GB upgrade)",
        gpu: "NVIDIA GeForce GTX 660M 2GB",
        storage: "256GB Crucial M4 SSD + 750GB HDD",
        display: '15.6" Full HD Matte',
        os: "Windows 8",
        "producer": "MSI",
        "releaseYear": 2012,
        "image": {
            "src": "/gear/msi-ge60.png",
            "alt": "MSI GE60 0ND-257US product view",
            "sourceUrl": "https://www.notebookcheck.net/uploads/tx_nbc2/msiGE60_01.jpg",
            "backgroundRemoved": true
        },
        "specs": {
            "Memory": "24GB DDR3 (8GB + 16GB upgrade)",
            "Graphics": "NVIDIA GeForce GTX 660M 2GB",
            "Processor": "Intel Core i7-3630QM 2.4GHz",
            "Storage": "256GB Crucial M4 SSD + 750GB HDD",
            "Operating system": "Windows 8",
            "Display": "15.6\" Full HD Matte",
            "Ports": "2 × USB 3.0, 2 × USB 2.0, HDMI, VGA",
            "Wireless": "Wi-Fi b/g/n and Bluetooth 4.0",
            "Weight": "2.4kg"
        },
        "sources": [
            {
                "label": "Manufacturer product information",
                "url": "https://www.msi.com/Laptop/GE60_0ND/Specification"
            }
        ],
        acquireDate: "2013-06",
        active: false,
        doneDate: "2021-11",
    },
    {
        category: "laptop",
        subtype: "laptop",
        make: "Apple",
        model: 'MacBook Pro 16" (M4 Pro)',
        cpu: "Apple M4 Pro (14-core CPU, 20-core GPU)",
        ram: "48GB unified memory",
        storage: "512GB SSD",
        display: '16" Liquid Retina XDR',
        os: "macOS",
        "producer": "Apple",
        "releaseYear": 2024,
        "image": {
            "src": "/gear/apple-mbp-m4.png",
            "alt": "Apple MacBook Pro 16\" (M4 Pro) product view",
            "sourceUrl": "https://cdsassets.apple.com/live/7WUAS350/images/tech-specs/mbp16-2024.png",
            "backgroundRemoved": true
        },
        "specs": {
            "Memory": "48GB unified memory",
            "Processor": "Apple M4 Pro (14-core CPU, 20-core GPU)",
            "Storage": "512GB SSD",
            "Operating system": "macOS",
            "Display": "16\" Liquid Retina XDR",
            "Refresh rate": "ProMotion up to 120Hz",
            "Ports": "3 × Thunderbolt 5, HDMI, SDXC, MagSafe 3",
            "Camera": "12MP Center Stage"
        },
        "sources": [
            {
                "label": "Manufacturer product information",
                "url": "https://support.apple.com/en-us/121554"
            }
        ],
        acquireDate: "2026-01",
        active: true,
    },
    {
        category: "laptop",
        subtype: "laptop",
        make: "ASUS",
        model: "ROG Zephyrus G16 (GU605MY)",
        cpu: "Intel Core Ultra 9 185H",
        ram: "32GB LPDDR5X-7467",
        gpu: "GeForce RTX 4090 16GB GDDR6",
        storage: "2TB M.2 NVMe SSD PCIe 4.0",
        display: '16" 240Hz OLED WQXGA (DCI-P3)',
        os: "Windows 11",
        "producer": "ASUS",
        "releaseYear": 2024,
        "image": {
            "src": "/gear/asus-gu605.webp",
            "alt": "ASUS ROG Zephyrus G16 (GU605MY) product view",
            "sourceUrl": "https://dlcdnwebimgs.asus.com/gain/CD8E933A-10C0-4E13-91D3-AB4A248A19A1/w800/fwebp"
        },
        "specs": {
            "Memory": "32GB LPDDR5X-7467",
            "Graphics": "GeForce RTX 4090 16GB GDDR6",
            "Processor": "Intel Core Ultra 9 185H",
            "Storage": "2TB M.2 NVMe SSD PCIe 4.0",
            "Operating system": "Windows 11",
            "Display": "16\" 240Hz OLED WQXGA (DCI-P3)",
            "Resolution": "2560 × 1600",
            "Battery": "90Wh",
            "Wireless": "Wi-Fi 6E and Bluetooth 5.3"
        },
        "sources": [
            {
                "label": "Manufacturer product information",
                "url": "https://rog.asus.com/laptops/rog-zephyrus/rog-zephyrus-g16-2024/spec/"
            }
        ],
        acquireDate: "2024-04",
        active: false,
        doneDate: "2024-11",
    },

    // ── Camera ───────────────────────────────────────────────────────
    {
        category: "camera",
        subtype: "body",
        make: "Canon",
        model: "EOS Rebel T3i",
        "producer": "Canon",
        "releaseYear": 2011,
        "image": {
            "src": "/gear/canon-t3i.png",
            "alt": "Canon EOS Rebel T3i product view",
            "sourceUrl": "https://r2cdn.expertphotography.com/products/155/0-Canon_EOS_Rebel_T3i.png"
        },
        "specs": {
            "Sensor": "18MP APS-C CMOS",
            "Processor": "DIGIC 4",
            "Lens mount": "Canon EF / EF-S",
            "Video": "Full HD 1080p",
            "Screen": "3-inch vari-angle LCD",
            "Burst shooting": "Up to 3.7fps"
        },
        "sources": [
            {
                "label": "Manufacturer product information",
                "url": "https://global.canon/en/c-museum/product/dslr806.html"
            }
        ],
        acquireDate: "2018-01",
        active: false,
        doneDate: "2020-02",
    },
    {
        category: "camera",
        subtype: "body",
        make: "Canon",
        model: "EOS Rebel T7i",
        "producer": "Canon",
        "releaseYear": 2017,
        "image": {
            "src": "/gear/canon-t7i.png",
            "alt": "Canon EOS Rebel T7i product view",
            "sourceUrl": "https://www.canon.ca/dam/products/BUSINESS-UNIT/ITCG/Cameras/EOS-Cameras/DSLR/EOS-Rebel-T7i/Canon_EOS-Rebel-T7i-_Front_580x580.png"
        },
        "specs": {
            "Sensor": "24.2MP APS-C CMOS",
            "Processor": "DIGIC 7",
            "Lens mount": "Canon EF / EF-S",
            "Autofocus": "45 cross-type points; Dual Pixel CMOS AF",
            "Video": "Full HD 1080p",
            "Screen": "3-inch vari-angle touchscreen",
            "Burst shooting": "Up to 6fps"
        },
        "sources": [
            {
                "label": "Manufacturer product information",
                "url": "https://global.canon/en/c-museum/product/dslr853.html"
            }
        ],
        acquireDate: "2020-02",
        active: true,
    },
    {
        category: "camera",
        subtype: "body",
        make: "Insta360",
        model: "X3",
        "producer": "Insta360",
        "releaseYear": 2022,
        "image": {
            "src": "/gear/insta360-x3.png",
            "alt": "Insta360 X3 product view",
            "sourceUrl": "https://cifra39.com/upload/iblock/fb7/e19isb056k78whsk1bm7gyocyug166dp.png"
        },
        "specs": {
            "Sensors": "Dual 1/2-inch sensors",
            "360 video": "5.7K",
            "360 photos": "Up to 72MP",
            "Single-lens video": "4K",
            "Screen": "2.29-inch touchscreen",
            "Battery": "1,800mAh",
            "Waterproofing": "10m without a dive case"
        },
        "sources": [
            {
                "label": "Manufacturer product information",
                "url": "https://www.insta360.com/blog/news/insta360-x3-360-action-cam.html"
            }
        ],
        acquireDate: "2023-01",
        active: true,
    },
    {
        category: "camera",
        subtype: "lens",
        make: "Sigma",
        model: "50mm F1.4 DG HSM Art",
        focalLength: "50mm",
        maxAperture: "f/1.4",
        "producer": "Sigma",
        "releaseYear": 2014,
        "image": {
            "src": "/gear/sigma-50art.png",
            "alt": "Sigma 50mm F1.4 DG HSM Art product view",
            "sourceUrl": "https://www.sigma-italia.it/cdn/shop/files/ff_a012_50_14_basic_02.webp?v=1759930148&width=1000"
        },
        "specs": {
            "Focal length": "50mm",
            "Maximum aperture": "f/1.4",
            "Format": "Full-frame DG",
            "Construction": "13 elements in 8 groups",
            "Aperture blades": "9 rounded blades",
            "Minimum focus": "40cm",
            "Filter thread": "77mm"
        },
        "sources": [
            {
                "label": "Manufacturer product information",
                "url": "https://www.sigma-global.com/en/lenses/a014_50_14/"
            }
        ],
        acquireDate: "2020-02",
        active: true,
    },

    {
        category: "camera",
        subtype: "lens",
        make: "Canon",
        model: "EF-S 24mm f/2.8 STM",
        focalLength: "24mm",
        maxAperture: "f/2.8",
        producer: "Canon",
        releaseYear: 2014,
        image: {
            src: "/gear/canon-efs24-stm.jpg",
            alt: "Canon EF-S 24mm f/2.8 STM lens product view",
            sourceUrl: "https://global.canon/ja/c-museum/wp-content/uploads/2015/06/ef434_b.jpg",
        },
        specs: {
            "Focal length": "24mm",
            "Maximum aperture": "f/2.8",
            "Lens mount": "Canon EF-S",
            "Construction": "6 elements in 5 groups",
            "Minimum focus": "16cm",
            "Filter thread": "52mm",
            "Weight": "125g",
        },
        sources: [{ label: "Manufacturer product information", url: "https://global.canon/en/c-museum/product/ef434.html" }],
        acquireDate: "2022-05-31",
        active: true,
    },
    {
        category: "camera",
        subtype: "lens",
        make: "Canon",
        model: "EF-S 18-135mm f/3.5-5.6 IS USM",
        focalLength: "18-135mm",
        maxAperture: "f/3.5-5.6",
        producer: "Canon",
        releaseYear: 2016,
        image: {
            src: "/gear/canon-efs18-135-usm.png",
            alt: "Canon EF-S 18-135mm f/3.5-5.6 IS USM lens product view",
            sourceUrl: "https://asia.canon/media/migration/shared/live/products/EN/ef-s18-135mm-f3.5-5.6-is-usm_b1.png",
        },
        specs: {
            "Focal length": "18-135mm",
            "Maximum aperture": "f/3.5-5.6",
            "Lens mount": "Canon EF-S",
            "Autofocus": "Nano USM",
            "Stabilization": "Optical IS, up to 4 stops",
            "Construction": "16 elements in 12 groups",
            "Minimum focus": "39cm",
            "Filter thread": "67mm",
        },
        sources: [{ label: "Manufacturer product information", url: "https://global.canon/en/c-museum/product/ef454.html" }],
        acquireDate: "2023-06-05",
        active: true,
    },

    // ── Desk, audio and microphone history ───────────────────────────
    {
        "category": "audio",
        "subtype": "headphones",
        "make": "Sennheiser",
        "model": "HD 4.50 BTNC",
        "description": "Over-ear · NoiseGard active noise cancellation",
        "producer": "Sennheiser",
        "releaseYear": null,
        "image": {
            "src": "/gear/sennheiser-hd450-btnc.jpg",
            "alt": "Sennheiser HD 4.50 BTNC product view",
            "sourceUrl": "https://f.nooncdn.com/p/pzsku/ZDE973FD7702379C069D9Z/45/_/1780467094/7235fe9a-1a69-4b07-b1ba-0e90813bc745.jpg"
        },
        "specs": {
            "Design": "Closed-back over-ear",
            "Wireless": "Bluetooth 4.0 and NFC",
            "Noise cancellation": "NoiseGard active noise cancellation",
            "Battery": "Up to 19 hours with Bluetooth and NoiseGard; 25 hours with Bluetooth only",
            "Frequency response": "18 Hz to 22 kHz"
        },
        "sources": [
            {
                "label": "Manufacturer product information",
                "url": "https://assets.sennheiser.com/global-downloads/file/7891/HD4.50BTNC_HD4.50R_Manual_EN.pdf"
            }
        ],
        "acquireDate": "2018-02-26",
        "active": true
    },
    {
        "category": "audio",
        "subtype": "earbuds",
        "make": "Shure",
        "model": "SE215-CL-UNI",
        "description": "Wired in-ear earphones · Sound Isolating",
        "producer": "Shure",
        "releaseYear": null,
        "image": {
            "src": "/gear/shure-se215.png",
            "alt": "Shure SE215-CL-UNI product view",
            "sourceUrl": "https://products.shureweb.eu/shure_product_db/product_main_images/files/daa/379/98-/large_transparent/9e366ca65e6fa0e87e688a9bbd6a08be.png",
            "note": "Manufacturer photo includes the SE215-CL+UNI earphones, cable and supplied accessories."
        },
        "specs": {
            "Design": "Sound Isolating in-ear earphones",
            "Connection": "Detachable 3.5 mm communication cable",
            "Controls": "Inline remote and microphone",
            "Cable connector": "MMCX",
            "Color": "Clear"
        },
        "sources": [
            {
                "label": "Manufacturer product information",
                "url": "https://www.shure.com/es-MX/productos/audifonos-sound-isolating/se215_wired?variant=SE215-CL%2BUNI"
            }
        ],
        "acquireDate": "2018-05-20",
        "active": false,
        "doneDate": "2018-06-11"
    },
    {
        "category": "audio",
        "subtype": "earbuds",
        "make": "Google",
        "model": "Pixel Buds Pro",
        "description": "Wireless earbuds · Active noise cancellation",
        "producer": "Google",
        "releaseYear": 2022,
        "image": {
            "src": "/gear/pixel-buds-pro.jpg",
            "alt": "Google Pixel Buds Pro product view",
            "sourceUrl": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6512/6512114ld.jpg"
        },
        "specs": {
            "Drivers": "11 mm dynamic",
            "Wireless": "Bluetooth 5.0",
            "Noise control": "Active Noise Cancellation and Transparency mode",
            "Battery": "Up to 11 hours; up to 7 hours with ANC",
            "Water resistance": "IPX4 earbuds; IPX2 case",
            "Color": "Charcoal"
        },
        "sources": [
            {
                "label": "Manufacturer product information",
                "url": "https://support.google.com/googlepixelbuds/answer/7544332?hl=en"
            }
        ],
        "acquireDate": "2023-03-06",
        "active": true
    },
    {
        "category": "microphone",
        "subtype": "microphone",
        "make": "Shure",
        "model": "MV7",
        "description": "Dynamic microphone · USB and XLR",
        "producer": "Shure",
        "releaseYear": null,
        "image": {
            "src": "/gear/shure-mv7.png",
            "alt": "Shure MV7 product view",
            "sourceUrl": "https://products.shureweb.eu/shure_product_db/product_main_images/files/65f/845/9d-/large_transparent/780ff1532e5f3cb758123e44cec7768b.png"
        },
        "specs": {
            "Type": "Dynamic microphone",
            "Polar pattern": "Cardioid",
            "Connections": "XLR and Micro-B USB",
            "Monitoring": "3.5 mm headphone output",
            "Frequency response": "50 Hz to 16 kHz",
            "Color": "Black"
        },
        "sources": [
            {
                "label": "Manufacturer product information",
                "url": "https://www.shure.com/en-US/docs/guide/MV7"
            }
        ],
        "acquireDate": "2023-03-06",
        "active": true
    },
    {
        "category": "desk",
        "subtype": "desk",
        "make": "IKEA",
        "model": "BEKANT Corner Desk",
        "description": "Black corner desk",
        "producer": "IKEA",
        "releaseYear": null,
        "image": {
            "src": "/gear/ikea-bekant-corner-black.jpg",
            "alt": "IKEA BEKANT black corner desk, left-hand reference model",
            "sourceUrl": "https://image-ikea.mncdn.com/urunler/2000_2000/PE740525.jpg",
            "note": "Left-hand black-stained ash model shown. Exact side and finish variant not recorded."
        },
        "specs": {
            "Type": "Corner desk",
            "Color": "Black",
            "Desktop": "Contoured corner tabletop",
            "Cable management": "Net beneath the tabletop"
        },
        "sources": [
            {
                "label": "IKEA product information and reference photo",
                "url": "https://www.ikea.com.tr/en/product/bekant-black-stained-ash-veneer-black-160x110-cm-corner-desk-left-19282801"
            }
        ],
        "acquireDate": "2018-09",
        "active": false,
        "doneDate": "2020-07-14"
    },
    {
        category: "desk",
        subtype: "chair",
        make: "IKEA",
        model: "RENBERGET",
        description: "Swivel chair · Bomstad black",
        producer: "IKEA",
        releaseYear: null,
        image: {
            src: "/gear/ikea-renberget-black.jpg",
            alt: "IKEA RENBERGET swivel chair in Bomstad black",
            sourceUrl: "https://www.ikea.com/us/en/images/products/renberget-swivel-chair-bomstad-black__1020135_pe831794_s5.jpg",
        },
        specs: {
            Type: "Swivel office chair",
            Color: "Bomstad black",
            "Seat height": "Adjustable",
            "Tilt tension": "Adjustable",
        },
        sources: [
            { label: "IKEA RENBERGET product information supplied by Josh", url: "https://www.ikea.com/us/en/p/renberget-swivel-chair-bomstad-black-40611094/" },
        ],
        acquireDate: "2018-09",
        active: false,
        doneDate: "2021-11",
    },
    {
        "category": "desk",
        "subtype": "desk",
        "make": "VIVO",
        "model": "DESK-V102E",
        "description": "Black electric standing desk frame",
        "producer": "VIVO",
        "releaseYear": null,
        "image": {
            "src": "/gear/vivo-desk-v102e.jpg",
            "alt": "VIVO DESK-V102E product view",
            "sourceUrl": "https://cdn.shopify.com/s/files/1/1190/2562/files/Shopify2_02866e86-6206-4ec5-9e88-0b905f2ed7f7.jpg?v=1794498007&width=1000"
        },
        "specs": {
            "Type": "Electric standing desk frame",
            "Motor": "Single motor",
            "Controller": "Touchscreen memory controller",
            "Color": "Black",
            "Desktop": "Separate tabletop required"
        },
        "sources": [
            {
                "label": "Manufacturer product information",
                "url": "https://vivo-us.com/products/desk-v102e"
            }
        ],
        "acquireDate": "2020-07-14",
        "active": true
    },
    {
        category: "desk",
        subtype: "chair",
        make: "Secretlab",
        model: "TITAN Evo",
        description: "Cookies & Cream · SoftWeave Plus fabric",
        producer: "Secretlab",
        releaseYear: 2021,
        image: {
            src: "/gear/secretlab-titan-evo-cookies-cream.jpg",
            alt: "Secretlab TITAN Evo chair in Cookies & Cream",
            sourceUrl: "https://blog.secretlab.co/stories/domidul/uploads/2021/11/SW_Post6_blog4.jpg",
        },
        specs: {
            Type: "Gaming chair",
            Color: "Cookies & Cream",
            Upholstery: "SoftWeave Plus fabric",
            "Lumbar support": "4-way L-ADAPT system",
            Armrests: "4D with CloudSwap tops",
            Recline: "Up to 165°",
        },
        sources: [
            { label: "Secretlab TITAN Evo launch, July 2021", url: "https://blog.secretlab.co/stories/the-all-new-secretlab-titan-evo-2022/" },
            { label: "Secretlab Cookies & Cream photo and upholstery", url: "https://blog.secretlab.co/stories/which-softweave-plus-color-is-right-for-you/" },
        ],
        acquireDate: "2021-11",
        active: true,
    },
    {
        "category": "desk",
        "subtype": "webcam",
        "make": "HAVIT",
        "model": "HV-N5086",
        "description": "VGA webcam · Integrated USB microphone",
        "producer": "HAVIT",
        "releaseYear": null,
        "image": {
            "src": "/gear/havit-hv-n5086.jpg",
            "alt": "HAVIT HV-N5086 webcam product view",
            "sourceUrl": "https://www.computervillage.com.bd/image/cache/catalog/products_2025/hv-n5086-01-500x500-550x550.jpg"
        },
        "specs": {
            "Video": "640 × 480 (VGA) recommended",
            "Frame rate": "Up to 30fps at VGA",
            "Connection": "USB 2.0, compatible with USB 1.1",
            "Microphone": "Integrated USB microphone",
            "Lighting": "Three adjustable LEDs",
            "Power": "5V via USB",
            "Mount": "Folding monitor clip"
        },
        "sources": [
            {
                "label": "Original HAVIT HV-N5086 user manual",
                "url": "https://images-na.ssl-images-amazon.com/images/I/61TQF7ituQL.pdf"
            },
            {
                "label": "Exact-model product photo reference",
                "url": "https://www.computervillage.com.bd/havit-hv-n5086-webcam"
            }
        ],
        "acquireDate": "2017-11-28",
        "active": false,
        "doneDate": "2020-07-20"
    },
    {
        "category": "desk",
        "subtype": "webcam",
        "make": "NexiGo",
        "model": "N930AF",
        "description": "1080p webcam · Autofocus and privacy cover",
        "producer": "NexiGo",
        "releaseYear": null,
        "image": {
            "src": "/gear/nexigo-n930af.jpg",
            "alt": "NexiGo N930AF autofocus webcam with its privacy cover",
            "sourceUrl": "https://cdn.shopify.com/s/files/1/0081/8207/1377/products/N930AF.jpg?v=1629178422&width=960"
        },
        "specs": {
            "Video": "1920 × 1080 at 30fps",
            "Focus": "Autofocus",
            "Field of view": "74 degrees diagonal",
            "Sensor": "1/2.7-inch 2MP CMOS",
            "Microphone": "Built-in noise-reducing microphone",
            "Connection": "USB plug and play",
            "Privacy": "Included privacy cover"
        },
        "sources": [
            {
                "label": "NexiGo N930AF technical information",
                "url": "https://www.nexigo.com/pages/n930af-technical-information"
            },
            {
                "label": "Manufacturer model and product-listing reference",
                "url": "https://www.nexigo.com/pages/comparison-table"
            },
            {
                "label": "Purchased model product listing",
                "url": "https://www.amazon.com/dp/B08931JJLV"
            }
        ],
        "acquireDate": "2020-07-20",
        "active": false,
        "doneDate": "2022-09-12"
    },
    {
        "category": "desk",
        "subtype": "webcam",
        "make": "Logitech",
        "model": "Brio 4K",
        "description": "4K webcam · Autofocus and HDR",
        "producer": "Logitech",
        "releaseYear": 2017,
        "image": {
            "src": "/gear/logitech-brio.png",
            "alt": "Logitech Brio 4K product view",
            "sourceUrl": "https://resource.logitech.com/content/dam/logitech/en/products/webcams/brio/gallery/brio-gallery-1.png"
        },
        "specs": {
            "Video": "4K at 30 fps; 1080p at up to 60 fps",
            "Field of view": "65, 78 or 90 degrees",
            "Focus": "Autofocus",
            "Light correction": "RightLight 3 with HDR",
            "Security": "Windows Hello infrared sensor"
        },
        "sources": [
            {
                "label": "Manufacturer product information",
                "url": "https://www.logitech.com/content/dam/logitech/vc/eu/pdf/brio-datasheet.pdf"
            }
        ],
        "acquireDate": "2022-09-12",
        "active": true
    },
    {
        "category": "desk",
        "subtype": "switch",
        "make": "AOOCOO",
        "model": "Dual Monitor DisplayPort KVM",
        "description": "Two computers · Two monitors · USB 3.0",
        "producer": "AOOCOO",
        "releaseYear": null,
        "image": {
            "src": "/gear/aoocoo-dp-kvm.jpg",
            "alt": "AOOCOO dual-monitor DisplayPort KVM switch product view",
            "sourceUrl": "https://m.media-amazon.com/images/I/71Cs+PTqRBL._SL1500_.jpg"
        },
        "specs": {
            "Computers": "2",
            "Monitors": "2 DisplayPort displays",
            "USB hub": "4 USB 3.0 ports",
            "Video modes": "Up to 8K at 60Hz or 4K at 240Hz",
            "Switching": "Front button or wired remote"
        },
        "sources": [
            {
                "label": "Product information",
                "url": "https://www.amazon.com/dp/B0FY35SY67"
            }
        ],
        "acquireDate": "2026-03-14",
        "active": true
    },


    // ── Phone ──────────────────────────────────────────────────────
    {
        category: "phone",
        subtype: "phone",
        make: "LG",
        model: "Banter",
        "producer": "LG",
        "releaseYear": 2009,
        "image": {
            "src": "/gear/lg-banter-black.png",
            "alt": "Black LG Banter product view",
            "sourceUrl": "https://www.lg.com/content/dam/channel/wcms/ca_en/images/cell-phones/lg265t/gallery/large05.jpg",
            "backgroundRemoved": true,
            "colorAdjusted": true
        },
        "specs": {
            "Form factor": "Slider with four-row QWERTY keyboard",
            "Camera": "1.3MP",
            "Connectivity": "Bluetooth",
            "Expansion": "microSD up to 16GB",
            "Audio": "MP3 music player",
            "Color": "Black"
        },
        "sources": [
            {
                "label": "Manufacturer product information",
                "url": "https://www.lg.com/ca_en/cell-phones/smartphones/lg265t/"
            }
        ],
        acquireDate: "2010-06",
        active: false,
        doneDate: "2013-08",
    },
    {
        category: "phone",
        subtype: "phone",
        make: "Google",
        model: "Nexus 4",
        "producer": "LG / Google",
        "releaseYear": 2012,
        "image": {
            "src": "/gear/nexus4.png",
            "alt": "Black Google Nexus 4 product view",
            "sourceUrl": "https://www.svetandroida.cz/media/2015/04/LG-Nexus-4-16-GB-schwarz.png"
        },
        "specs": {
            "Processor": "Qualcomm Snapdragon S4 Pro",
            "Memory": "2GB RAM",
            "Display": "4.7-inch IPS, 1280 × 768",
            "Rear camera": "8MP",
            "Battery": "2,100mAh",
            "Charging": "Micro-USB and Qi wireless",
            "Color": "Black"
        },
        "sources": [
            {
                "label": "Manufacturer product information",
                "url": "https://www.lg.com/global/newsroom/news/corporate/lg-and-google-announce-nexus-4-2/"
            }
        ],
        acquireDate: "2013-08",
        active: false,
        doneDate: "2015-06",
    },
    {
        category: "phone",
        subtype: "phone",
        make: "LG",
        model: "G4",
        "producer": "LG",
        "releaseYear": 2015,
        "image": {
            "src": "/gear/lg-g4.png",
            "alt": "Black LG G4 product view",
            "sourceUrl": "https://cdn2.cellphones.com.vn/x/media/catalog/product/g/4/g4.png",
            "backgroundRemoved": true
        },
        "specs": {
            "Processor": "Qualcomm Snapdragon 808",
            "Memory": "3GB RAM",
            "Display": "5.5-inch IPS Quantum, 2560 × 1440",
            "Rear camera": "16MP, f/1.8, optical stabilization",
            "Battery": "3,000mAh, removable",
            "Expansion": "microSD",
            "Color": "Black"
        },
        "sources": [
            {
                "label": "Manufacturer product information",
                "url": "https://www.lg.com/ar/acerca-de-lg/press-and-media/lgg4"
            }
        ],
        acquireDate: "2015-06",
        active: false,
        doneDate: "2016-07",
    },
    {
        category: "phone",
        subtype: "phone",
        make: "Samsung",
        model: "Galaxy S7 Edge",
        "producer": "Samsung",
        "releaseYear": 2016,
        "image": {
            "src": "/gear/samsung-s7edge-black.png",
            "alt": "Black Samsung Galaxy S7 Edge product view",
            "sourceUrl": "https://www.pinclipart.com/picdir/middle/205-2059880_samsung-s7-front-view-mockup-samsung-galaxy-s7.png",
            "backgroundRemoved": true,
            "colorAdjusted": true
        },
        "specs": {
            "Display": "5.5-inch curved Quad HD Super AMOLED",
            "Memory": "4GB RAM",
            "Rear camera": "12MP Dual Pixel, f/1.7",
            "Battery": "3,600mAh",
            "Water resistance": "IP68",
            "Expansion": "microSD",
            "Color": "Black"
        },
        "sources": [
            {
                "label": "Manufacturer product information",
                "url": "https://www.samsungmobilepress.com/articles/samsung-unveils-next-generation-smartphones-at-the-core-of-its-connected-galaxy-experience"
            }
        ],
        acquireDate: "2016-07",
        active: false,
        doneDate: "2018-02",
    },
    {
        category: "phone",
        subtype: "phone",
        make: "Google",
        model: "Pixel 2 XL",
        "producer": "Google",
        "releaseYear": 2017,
        "image": {
            "src": "/gear/pixel2xl-black.png",
            "alt": "Black Google Pixel 2 XL product view",
            "sourceUrl": "https://www.pngkey.com/png/full/202-2020367_clip-art-black-and-white-google-pixel-xl.png",
            "colorAdjusted": true
        },
        "specs": {
            "Processor": "Qualcomm Snapdragon 835",
            "Memory": "4GB LPDDR4x RAM",
            "Display": "6-inch QHD+ pOLED, 2880 × 1440",
            "Rear camera": "12.2MP dual-pixel",
            "Battery": "3,520mAh",
            "Water resistance": "IP67",
            "Color": "Black"
        },
        "sources": [
            {
                "label": "Manufacturer product information",
                "url": "https://support.google.com/pixelphone/answer/16043605?hl=en"
            }
        ],
        acquireDate: "2018-02",
        active: false,
        doneDate: "2018-12",
    },
    {
        category: "phone",
        subtype: "phone",
        make: "Google",
        model: "Pixel 3 XL",
        "producer": "Google",
        "releaseYear": 2018,
        "image": {
            "src": "/gear/pixel3xl-black.png",
            "alt": "Black Google Pixel 3 XL product view",
            "sourceUrl": "https://media2.gsm55.com/media/device/4305/4305.png",
            "colorAdjusted": true
        },
        "specs": {
            "Processor": "Qualcomm Snapdragon 845",
            "Memory": "4GB LPDDR4x RAM",
            "Display": "6.3-inch QHD+ OLED, 2960 × 1440",
            "Rear camera": "12.2MP dual-pixel",
            "Front cameras": "Dual 8MP cameras",
            "Battery": "3,430mAh",
            "Charging": "USB-C and Qi wireless",
            "Color": "Black"
        },
        "sources": [
            {
                "label": "Manufacturer product information",
                "url": "https://support.google.com/pixelphone/answer/16043605?hl=en"
            }
        ],
        acquireDate: "2018-12",
        active: false,
        doneDate: "2022-11",
    },
    {
        category: "phone",
        subtype: "phone",
        make: "Google",
        model: "Pixel 6 Pro",
        "producer": "Google",
        "releaseYear": 2021,
        "image": {
            "src": "/gear/pixel6pro.png",
            "alt": "Black Google Pixel 6 Pro product view",
            "sourceUrl": "https://i.ebayimg.com/images/g/1FIAAOSwoPVkR7aS/s-l640.png"
        },
        "specs": {
            "Processor": "Google Tensor",
            "Memory": "12GB LPDDR5 RAM",
            "Display": "6.7-inch LTPO OLED, up to 120Hz",
            "Rear cameras": "50MP wide, 12MP ultrawide, 48MP telephoto",
            "Optical zoom": "4× telephoto",
            "Battery": "5,003mAh (typical)",
            "Water resistance": "IP68",
            "Color": "Black"
        },
        "sources": [
            {
                "label": "Manufacturer product information",
                "url": "https://support.google.com/pixelphone/answer/7158570?hl=en"
            }
        ],
        acquireDate: "2022-11",
        active: false,
        doneDate: "2023-05",
    },
    {
        category: "phone",
        subtype: "phone",
        make: "Google",
        model: "Pixel 7 Pro",
        "producer": "Google",
        "releaseYear": 2022,
        "image": {
            "src": "/gear/pixel7pro-black.png",
            "alt": "Black Google Pixel 7 Pro product view",
            "sourceUrl": "https://telefonon.ru/wp-content/uploads/2022/09/google-pixel-7-pro.png",
            "colorAdjusted": true
        },
        "specs": {
            "Processor": "Google Tensor G2",
            "Memory": "12GB LPDDR5 RAM",
            "Display": "6.7-inch LTPO OLED, up to 120Hz",
            "Rear cameras": "50MP wide, 12MP ultrawide, 48MP telephoto",
            "Optical zoom": "5× telephoto",
            "Battery": "5,000mAh (typical)",
            "Water resistance": "IP68",
            "Color": "Black"
        },
        "sources": [
            {
                "label": "Manufacturer product information",
                "url": "https://support.google.com/pixelphone/answer/7158570?hl=en"
            }
        ],
        acquireDate: "2023-05",
        active: false,
        doneDate: "2024-09",
    },
    {
        category: "phone",
        subtype: "phone",
        make: "Google",
        model: "Pixel 9 Pro",
        "producer": "Google",
        "releaseYear": 2024,
        "image": {
            "src": "/gear/pixel9pro-black.png",
            "alt": "Black Google Pixel 9 Pro product view",
            "sourceUrl": "https://media.tatacroma.com/Croma%20Assets/Communication/Mobiles/Images/309145_0_liywir.png",
            "colorAdjusted": true
        },
        "specs": {
            "Processor": "Google Tensor G4",
            "Memory": "16GB RAM",
            "Display": "6.3-inch Super Actua LTPO OLED, 1-120Hz",
            "Rear cameras": "50MP wide, 48MP ultrawide, 48MP telephoto",
            "Optical zoom": "5× telephoto",
            "Battery": "4,700mAh (typical)",
            "Water resistance": "IP68",
            "Color": "Black"
        },
        "sources": [
            {
                "label": "Manufacturer product information",
                "url": "https://support.google.com/pixelphone/answer/7158570?hl=en"
            }
        ],
        acquireDate: "2024-09",
        active: false,
        doneDate: "2026-11-17",
    },
    {
        category: "phone",
        subtype: "phone",
        make: "Google",
        model: "Pixel 11 Pro",
        "producer": "Google",
        "releaseYear": 2026,
        "image": {
            "src": "/gear/pixel11pro-black.png",
            "alt": "Black Google Pixel 11 Pro product view",
            "sourceUrl": "https://cdn.beebom.com/mobile/google-pixel-11-pro-back-front-3.png",
            "colorAdjusted": true
        },
        "specs": {
            "Processor": "Google Tensor G6",
            "Display": "6.3-inch Super Actua LTPO OLED, 1-120Hz",
            "Resolution": "1280 × 2856",
            "Rear cameras": "50MP wide, 48MP ultrawide, 48MP telephoto",
            "Optical zoom": "5× telephoto",
            "Battery": "4,850mAh (typical)",
            "Wireless charging": "Qi2.2, up to 25W",
            "Color": "Black"
        },
        "sources": [
            {
                "label": "Manufacturer product information",
                "url": "https://store.google.com/us/product/pixel_11_pro_specs?hl=en-US"
            }
        ],
        acquireDate: "2026-11-17",
        active: true,
    },
    // Consoles supplied by Josh on 2026-11-27. Retirement dates are content, not UI rules.
    // Galaxy Style New 3DS XL corrected to November 2016 after Josh confirmed the model.
    {
        "category": "console",
        "subtype": "home",
        "make": "Nintendo",
        "model": "64",
        "description": "Fire Orange · Home console",
        "producer": "Nintendo",
        "releaseYear": null,
        "image": {
            "src": "/gear/nintendo-n64-fire-orange.jpg",
            "alt": "Nintendo 64 in Fire Orange (Funtastic) product view",
            "sourceUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b2/N64-Console-Orange.jpg/960px-N64-Console-Orange.jpg"
        },
        "specs": {
            "Color": "Fire Orange (translucent orange)",
            "Processor": "93.75MHz MIPS 64-bit RISC",
            "Co-processor": "62.5MHz Reality Co-Processor",
            "Controller ports": "Four",
            "Video resolution": "256 × 224 to 640 × 480",
            "Dimensions": "260 × 190 × 73mm",
            "Platform release": "1996; orange variant released later"
        },
        "sources": [
            {
                "label": "Nintendo product information",
                "url": "https://www.nintendo.com/en-gb/Hardware/Nintendo-History/Nintendo-64/Technical-Details/Technical-Details-627050.html"
            },
            {
                "label": "Nintendo release history",
                "url": "https://www.nintendo.co.jp/corporate/en/history/index.html"
            }
        ],
        "acquireDate": "2001-07",
        "active": false,
        "doneDate": "2001-12"
    },
    {
        "category": "console",
        "subtype": "home",
        "make": "Nintendo",
        "model": "GameCube",
        "description": "Indigo · Home console",
        "producer": "Nintendo",
        "releaseYear": 2001,
        "image": {
            "src": "/gear/nintendo-gamecube-indigo.png",
            "alt": "Nintendo GameCube in Indigo product view",
            "sourceUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2b/GameCube-Console-Set.png/960px-GameCube-Console-Set.png"
        },
        "specs": {
            "Color": "Indigo (purple)",
            "Processor": "485MHz IBM PowerPC Gekko",
            "Graphics processor": "162MHz Flipper",
            "System memory": "40MB total (24MB main + 16MB A-memory)",
            "Media": "8cm optical game discs, approximately 1.5GB",
            "Controller ports": "Four",
            "Memory-card slots": "Two"
        },
        "sources": [
            {
                "label": "Nintendo product information",
                "url": "https://www.nintendo.co.jp/ngc/specific/index.html"
            },
            {
                "label": "Nintendo release history",
                "url": "https://www.nintendo.co.jp/corporate/en/history/index.html"
            }
        ],
        "acquireDate": "2001-12",
        "active": false,
        "doneDate": "2006-11"
    },
    {
        "category": "console",
        "subtype": "home",
        "make": "Nintendo",
        "model": "Wii",
        "description": "Home console · Motion controls",
        "producer": "Nintendo",
        "releaseYear": 2006,
        "image": {
            "src": "/gear/nintendo-wii.png",
            "alt": "Nintendo Wii product view",
            "sourceUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f3/Wii-Console.png/960px-Wii-Console.png",
            "note": "White reference model shown. Owned color is unconfirmed."
        },
        "specs": {
            "Model": "Original Wii (RVL-001)",
            "Media": "Wii and Nintendo GameCube game discs",
            "Controller": "Wireless Wii Remote with motion controls",
            "USB ports": "Two",
            "Memory-card support": "SD slot and two GameCube memory-card slots",
            "GameCube controller ports": "Four"
        },
        "sources": [
            {
                "label": "Nintendo product information",
                "url": "https://csassets.nintendo.com/noaext/image/private/t_KA_PDF/WiiOpMn_EN_setup"
            },
            {
                "label": "Nintendo release history",
                "url": "https://en-americas-support.nintendo.com/app/answers/detail/a_id/2650/p/50/c/898"
            }
        ],
        "acquireDate": "2006-11",
        "active": false,
        "doneDate": "2014-11"
    },
    {
        "category": "console",
        "subtype": "home",
        "make": "Nintendo",
        "model": "Wii U",
        "description": "Home console · Wii U GamePad",
        "producer": "Nintendo",
        "releaseYear": 2012,
        "image": {
            "src": "/gear/nintendo-wii-u.jpg",
            "alt": "Nintendo Wii U product view",
            "sourceUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/dd/Nintendo-Wii-U-Console-FL.jpg/960px-Nintendo-Wii-U-Console-FL.jpg",
            "note": "Black reference model shown. Owned color and storage capacity are unconfirmed."
        },
        "specs": {
            "Processor": "IBM Power-based multi-core processor",
            "Graphics": "AMD Radeon-based HD graphics",
            "Media": "Wii U and Wii optical discs",
            "Video output": "Up to 1080p via HDMI",
            "USB ports": "Four USB 2.0 ports",
            "Wireless": "802.11b/g/n Wi-Fi"
        },
        "sources": [
            {
                "label": "Nintendo product information",
                "url": "https://www.nintendo.com/en-gb/Wii-U/Hardware-Features/Specifications/Specifications-664742.html"
            },
            {
                "label": "Nintendo release history",
                "url": "https://www.nintendo.co.jp/corporate/en/history/index.html"
            }
        ],
        "acquireDate": "2014-11",
        "active": false,
        "doneDate": "2017-07"
    },
    {
        "category": "console",
        "subtype": "hybrid",
        "make": "Nintendo",
        "model": "Switch",
        "description": "TV, tabletop and handheld",
        "producer": "Nintendo",
        "releaseYear": 2017,
        "image": {
            "src": "/gear/nintendo-switch-original.jpg",
            "alt": "Nintendo Switch product view",
            "sourceUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/76/Nintendo-Switch-Console-Docked-wJoyConRB.jpg/960px-Nintendo-Switch-Console-Docked-wJoyConRB.jpg",
            "note": "Neon blue/red Joy-Con shown. Owned controller colors are unconfirmed."
        },
        "specs": {
            "Generation": "Original Nintendo Switch (2017)",
            "Play modes": "TV, tabletop and handheld",
            "Display": "6.2-inch capacitive LCD, 1280 × 720",
            "Processor": "Custom NVIDIA Tegra",
            "TV output": "Up to 1920 × 1080 at 60fps",
            "Charging port": "USB-C"
        },
        "sources": [
            {
                "label": "Nintendo product information",
                "url": "https://www.nintendo.com/en-gb/Hardware/Nintendo-Switch-Family/Nintendo-Switch/Nintendo-Switch-1148779.html"
            },
            {
                "label": "Nintendo release history",
                "url": "https://www.nintendo.co.jp/corporate/en/history/index.html"
            }
        ],
        "acquireDate": "2017-07",
        "active": false,
        "doneDate": "2025-06"
    },
    {
        "category": "console",
        "subtype": "hybrid",
        "make": "Nintendo",
        "model": "Switch 2",
        "description": "TV, tabletop and handheld · Joy-Con 2",
        "producer": "Nintendo",
        "releaseYear": 2025,
        "image": {
            "src": "/gear/nintendo-switch-2.png",
            "alt": "Nintendo Switch 2 product view",
            "sourceUrl": "https://assets.nintendo.com/image/upload/c_scale,w_960/v1743547392/ccb3e8ca3c296e21a8c933e8369031511589d0ef6b079cf5bb3667b09893482c/Global%20Nav/Explore/Nintendo-Switch-2.png"
        },
        "specs": {
            "Display": "7.9-inch LCD, 1920 × 1080",
            "Display features": "HDR10 and VRR up to 120Hz",
            "Processor": "Custom NVIDIA processor",
            "TV output": "Up to 4K at 60fps; 1080p/1440p up to 120fps",
            "Wireless": "Wi-Fi 6 and Bluetooth",
            "Controllers": "Magnetic Joy-Con 2 attachment with mouse controls"
        },
        "sources": [
            {
                "label": "Nintendo product information",
                "url": "https://www.nintendo.com/us/gaming-systems/switch-2/tech-specs/"
            },
            {
                "label": "Nintendo release history",
                "url": "https://www.nintendo.co.jp/ir/pdf/2025/250508_5.pdf"
            },
            {
                "label": "Nintendo release history",
                "url": "https://www.nintendo.co.jp/corporate/en/history/index.html"
            }
        ],
        "acquireDate": "2025-06",
        "active": true
    },
    {
        "category": "console",
        "subtype": "portable",
        "make": "Nintendo",
        "model": "Game Boy Color",
        "description": "Atomic Purple · Portable",
        "producer": "Nintendo",
        "releaseYear": 1998,
        "image": {
            "src": "/gear/nintendo-game-boy-color-atomic-purple.png",
            "alt": "Nintendo Game Boy Color product view",
            "sourceUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c8/Game-Boy-Color-Purple.png/500px-Game-Boy-Color-Purple.png"
        },
        "specs": {
            "Color": "Atomic Purple (transparent purple)",
            "Display": "Color LCD with 32,768 possible colors and up to 56 simultaneous colors",
            "Compatibility": "Game Boy and Game Boy Color Game Paks",
            "Power": "2 AA batteries",
            "Weight": "138 g"
        },
        "sources": [
            {
                "label": "Nintendo product information",
                "url": "https://www.nintendo.com/en-gb/Hardware/Nintendo-History/Game-Boy-Color/Game-Boy-Color-627137.html"
            },
            {
                "label": "Nintendo release history",
                "url": "https://press.nintendo.com/CompanyHistory"
            }
        ],
        "acquireDate": "2000-12",
        "active": false,
        "doneDate": "2001-12"
    },
    {
        "category": "console",
        "subtype": "portable",
        "make": "Nintendo",
        "model": "Game Boy Advance",
        "description": "Indigo · Portable",
        "producer": "Nintendo",
        "releaseYear": 2001,
        "image": {
            "src": "/gear/nintendo-game-boy-advance-indigo.png",
            "alt": "Nintendo Game Boy Advance product view",
            "sourceUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0b/Nintendo-Game-Boy-Advance-Purple-FL.png/960px-Nintendo-Game-Boy-Advance-Purple-FL.png"
        },
        "specs": {
            "Color": "Indigo",
            "Processor": "32-bit CPU",
            "Display": "240 × 160 TFT color LCD",
            "Compatibility": "Game Boy Advance, Game Boy and Game Boy Color Game Paks",
            "Power": "2 AA batteries",
            "Weight": "Approximately 140 g"
        },
        "sources": [
            {
                "label": "Nintendo product information",
                "url": "https://www.nintendo.com/en-gb/Support/Legacy-system/Technical-data-619479.html"
            },
            {
                "label": "Nintendo release history",
                "url": "https://press.nintendo.com/CompanyHistory"
            }
        ],
        "acquireDate": "2001-12",
        "active": false,
        "doneDate": "2004-12"
    },
    {
        "category": "console",
        "subtype": "portable",
        "make": "Nintendo",
        "model": "DS",
        "description": "Portable · Dual screens",
        "producer": "Nintendo",
        "releaseYear": 2004,
        "image": {
            "src": "/gear/nintendo-ds-original-blue-reference.png",
            "alt": "Nintendo DS product view",
            "sourceUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a3/Nintendo-DS-Fat-Blue.png/960px-Nintendo-DS-Fat-Blue.png",
            "note": "Blue reference model shown. Owned color is unconfirmed."
        },
        "specs": {
            "Display": "Twin backlit color LCDs with touch-sensitive lower screen",
            "Compatibility": "Nintendo DS Game Cards and single-player Game Boy Advance Game Paks",
            "Wireless": "Local wireless multiplayer in compatible games",
            "Audio": "Stereo speakers and built-in microphone",
            "Power": "Rechargeable lithium-ion battery"
        },
        "sources": [
            {
                "label": "Nintendo product information",
                "url": "https://csassets.nintendo.com/noaext/image/private/t_KA_PDF/ds_english"
            },
            {
                "label": "Nintendo release history",
                "url": "https://press.nintendo.com/CompanyHistory"
            }
        ],
        "acquireDate": "2004-12",
        "active": false,
        "doneDate": "2006-07"
    },
    {
        "category": "console",
        "subtype": "portable",
        "make": "Nintendo",
        "model": "DS Lite",
        "description": "Polar White · Portable",
        "producer": "Nintendo",
        "releaseYear": 2006,
        "image": {
            "src": "/gear/nintendo-ds-lite-polar-white.png",
            "alt": "Nintendo DS Lite product view",
            "sourceUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c4/DSLite_white_trans.png/960px-DSLite_white_trans.png",
            "credit": {
                "label": "User:Havok and Estoy Aquí / Wikimedia Commons",
                "url": "https://commons.wikimedia.org/wiki/File:DSLite_white_trans.png",
                "license": "CC BY 2.5",
                "licenseUrl": "https://creativecommons.org/licenses/by/2.5/"
            }
        },
        "specs": {
            "Color": "Polar White",
            "Display": "Two 3-inch backlit TFT color LCDs; touch-sensitive lower screen",
            "Brightness": "Four brightness levels",
            "Compatibility": "Nintendo DS Game Cards and Game Boy Advance Game Paks",
            "Power": "Rechargeable lithium-ion battery",
            "Weight": "Approximately 218 g with battery and stylus"
        },
        "sources": [
            {
                "label": "Nintendo product information",
                "url": "https://www.nintendo.com/hk/ds/ds_lite.html"
            },
            {
                "label": "Nintendo release history",
                "url": "https://press.nintendo.com/CompanyHistory"
            }
        ],
        "acquireDate": "2006-07",
        "active": false,
        "doneDate": "2011-03"
    },
    {
        "category": "console",
        "subtype": "portable",
        "make": "Nintendo",
        "model": "3DS",
        "description": "Aqua Blue · Portable",
        "producer": "Nintendo",
        "releaseYear": 2011,
        "image": {
            "src": "/gear/nintendo-3ds-aqua-blue.png",
            "alt": "Nintendo 3DS product view",
            "sourceUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0a/Nintendo-3DS-AquaOpen.png/960px-Nintendo-3DS-AquaOpen.png"
        },
        "specs": {
            "Color": "Aqua Blue",
            "Display": "3.53-inch glasses-free 3D upper display and 3.02-inch lower touchscreen",
            "Compatibility": "Nintendo 3DS and Nintendo DS games",
            "Cameras": "Two outer cameras and one inner camera",
            "Sensors": "Motion sensor and gyro sensor",
            "Weight": "Approximately 235 g"
        },
        "sources": [
            {
                "label": "Nintendo product information",
                "url": "https://www.nintendo.com/eu/media/downloads/systems_7/nintendo_3ds_24/3DS_Family_PDF_table_enGB.pdf"
            },
            {
                "label": "Nintendo release history",
                "url": "https://press.nintendo.com/CompanyHistory"
            }
        ],
        "acquireDate": "2011-03",
        "active": false,
        "doneDate": "2016-11"
    },
    {
        "category": "console",
        "subtype": "portable",
        "make": "Nintendo",
        "model": "New 3DS XL (Galaxy Style)",
        "description": "Galaxy Style · Portable",
        "producer": "Nintendo",
        "releaseYear": 2016,
        "image": {
            "src": "/gear/nintendo-new-3ds-xl-galaxy.jpg",
            "alt": "New Nintendo 3DS XL (Galaxy Style) product view",
            "sourceUrl": "https://images.nintendolife.com/b2ab6d9fc0c3c/galaxy-style4.900x.jpg",
            "note": "Closed Galaxy Style console shown, displaying its galaxy-pattern lid."
        },
        "specs": {
            "Style": "Galaxy Style",
            "Upper display": "4.88-inch glasses-free 3D display",
            "3D": "Face-tracking super-stable 3D",
            "Controls": "Circle Pad, C Stick and ZL/ZR shoulder buttons",
            "amiibo": "Built-in NFC support",
            "Design": "Folding handheld console"
        },
        "sources": [
            {
                "label": "Nintendo product information",
                "url": "https://www.nintendo.com/en-gb/News/2015/February/New-Nintendo-3DS-and-New-Nintendo-3DS-XL-systems-launch-on-February-13th-alongside-new-bundles-games-and-free-themes-954727.html"
            },
            {
                "label": "Nintendo release history",
                "url": "https://x.com/NintendoAmerica/status/770290081185746944"
            }
        ],
        "acquireDate": "2016-11",
        "active": false,
        "doneDate": "2017-07"
    },
];
