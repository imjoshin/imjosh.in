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
) &
    (Active | Retired) & {
        producer: string;
        releaseYear: number | null;
        image: { src: string; alt: string; sourceUrl: string; note?: string; backgroundRemoved?: boolean; colorAdjusted?: boolean };
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
        make: "LG",
        model: '25UM57 25"',
        size: '25"',
        resolution: "2560x1080",
        panelType: "IPS",
        "producer": "LG",
        "releaseYear": 2015,
        "image": {
            "src": "/gear/lg-25um57.png",
            "alt": "LG 25UM57 25\" product view",
            "sourceUrl": "https://www.lg.com/content/dam/channel/wcms/tr/images/monitor/25um57/gallery/large01.jpg",
            "backgroundRemoved": true
        },
        "specs": {
            "Screen size": "25\"",
            "Resolution": "2560x1080",
            "Panel": "IPS",
            "Refresh rate": "60Hz",
            "Aspect ratio": "21:9",
            "Response time": "5ms (GTG)",
            "Inputs": "2 × HDMI"
        },
        "sources": [
            {
                "label": "Manufacturer product information",
                "url": "https://www.lg.com/us/support/products/documents/25UM57%20Spec%20Sheet.pdf"
            }
        ],
        acquireDate: "2015-08",
        active: false,
        doneDate: "2021-12",
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
        active: true,
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
        active: true,
        notes: "Primary monitor",
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
        acquireDate: "2026-03",
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
];
