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
        acquireDate: string;
        notes?: string;
    };

export type Category = UsesItem["category"];

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
        acquireDate: "2018-04",
        active: false,
        doneDate: "2020-12",
    },
    {
        category: "desktop",
        subtype: "keyboard",
        make: "FILCO",
        model: "Majestouch Convertible 2 (Cherry MX Brown)",
        acquireDate: "2020-12",
        active: false,
        doneDate: "2023-03",
    },
    {
        category: "desktop",
        subtype: "keyboard",
        make: "Logitech",
        model: "G613 LIGHTSPEED Wireless",
        acquireDate: "2023-03",
        active: true,
    },

    // Mice
    {
        category: "desktop",
        subtype: "mouse",
        make: "Razer",
        model: "Naga 2014 MMO",
        acquireDate: "2014-10",
        active: false,
        doneDate: "2018-05",
    },
    {
        category: "desktop",
        subtype: "mouse",
        make: "Razer",
        model: "Naga Chroma",
        acquireDate: "2018-05",
        active: false,
        doneDate: "2020-12",
    },
    {
        category: "desktop",
        subtype: "mouse",
        make: "Razer",
        model: "Mamba Wireless",
        acquireDate: "2020-12",
        active: false,
        doneDate: "2024-08",
    },
    {
        category: "desktop",
        subtype: "mouse",
        make: "Logitech",
        model: "MX Master 3S",
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
        acquireDate: "2018-01",
        active: false,
        doneDate: "2020-02",
    },
    {
        category: "camera",
        subtype: "body",
        make: "Canon",
        model: "EOS Rebel T7i",
        acquireDate: "2020-02",
        active: true,
    },
    {
        category: "camera",
        subtype: "body",
        make: "Insta360",
        model: "X3",
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
        acquireDate: "2020-02",
        active: true,
    },

    // ── Phone ──────────────────────────────────────────────────────
    {
        category: "phone",
        subtype: "phone",
        make: "LG",
        model: "Banter",
        acquireDate: "2010-06",
        active: false,
        doneDate: "2013-08",
    },
    {
        category: "phone",
        subtype: "phone",
        make: "Google",
        model: "Nexus 4",
        acquireDate: "2013-08",
        active: false,
        doneDate: "2015-06",
    },
    {
        category: "phone",
        subtype: "phone",
        make: "LG",
        model: "G4",
        acquireDate: "2015-06",
        active: false,
        doneDate: "2016-07",
    },
    {
        category: "phone",
        subtype: "phone",
        make: "Samsung",
        model: "Galaxy S7 Edge",
        acquireDate: "2016-07",
        active: false,
        doneDate: "2018-02",
    },
    {
        category: "phone",
        subtype: "phone",
        make: "Google",
        model: "Pixel 2 XL",
        acquireDate: "2018-02",
        active: false,
        doneDate: "2018-12",
    },
    {
        category: "phone",
        subtype: "phone",
        make: "Google",
        model: "Pixel 3 XL",
        acquireDate: "2018-12",
        active: false,
        doneDate: "2022-11",
    },
    {
        category: "phone",
        subtype: "phone",
        make: "Google",
        model: "Pixel 6 Pro",
        acquireDate: "2022-11",
        active: false,
        doneDate: "2023-05",
    },
    {
        category: "phone",
        subtype: "phone",
        make: "Google",
        model: "Pixel 7 Pro",
        acquireDate: "2023-05",
        active: false,
        doneDate: "2024-09",
    },
    {
        category: "phone",
        subtype: "phone",
        make: "Google",
        model: "Pixel 9 Pro",
        acquireDate: "2024-09",
        active: true,
    },
];
