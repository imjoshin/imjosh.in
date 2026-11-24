// Extracted from the prototype. Uses timeline (EV), specs, categories, resume jobs.
const EV = [
['2010-06','+','phone','LG Banter'],['2013-06','+','laptop','MSI GE60 0ND-257US'],
['2013-08','-','phone','LG Banter'],['2013-08','+','phone','Google Nexus 4'],['2014-10','+','mouse','Razer Naga 2014 MMO'],
['2015-06','-','phone','Google Nexus 4'],['2015-06','+','phone','LG G4'],['2015-08','+','monitor','LG 25UM57 25"'],
['2015-09','+','monitor','ASUS VG248QE 24"'],['2015-09','+','monitor','LG 29UM67 29"'],['2015-10','+','desktop','Custom i7-4790K / GTX 970 Build'],
['2016-07','-','phone','LG G4'],['2016-07','+','phone','Samsung Galaxy S7 Edge'],['2018-01','+','camera','Canon EOS Rebel T3i'],
['2018-02','-','phone','Samsung Galaxy S7 Edge'],['2018-02','+','phone','Google Pixel 2 XL'],['2018-04','+','keyboard','Corsair STRAFE RGB'],
['2018-05','-','mouse','Razer Naga 2014 MMO'],['2018-05','+','mouse','Razer Naga Chroma'],
['2018-12','-','phone','Google Pixel 2 XL'],['2018-12','+','phone','Google Pixel 3 XL'],
['2020-02','-','camera','Canon EOS Rebel T3i'],['2020-02','+','camera','Canon EOS Rebel T7i'],['2020-02','+','lens','Sigma 50mm F1.4 DG HSM Art'],
['2020-04','-','desktop','Custom i7-4790K / GTX 970 Build'],['2020-04','+','desktop','Custom Ryzen 7 3700X / RTX 2070S Build'],
['2020-12','-','keyboard','Corsair STRAFE RGB'],['2020-12','+','keyboard','FILCO Majestouch Convertible 2'],
['2020-12','-','mouse','Razer Naga Chroma'],['2020-12','+','mouse','Razer Mamba Wireless'],['2021-11','-','laptop','MSI GE60 0ND-257US'],
['2021-12','-','monitor','LG 25UM57 25"'],['2021-12','-','monitor','ASUS VG248QE 24"'],['2021-12','+','monitor','MSI Optix G27CQ4 27"'],
['2022-11','-','phone','Google Pixel 3 XL'],['2022-11','+','phone','Google Pixel 6 Pro'],['2023-01','+','camera','Insta360 X3'],
['2023-03','-','monitor','LG 29UM67 29"'],['2023-03','+','monitor','LG UltraGear 34GP63A-B 34"'],
['2023-03','-','keyboard','FILCO Majestouch Convertible 2'],['2023-03','+','keyboard','Logitech G613 LIGHTSPEED'],
['2023-05','-','phone','Google Pixel 6 Pro'],['2023-05','+','phone','Google Pixel 7 Pro'],['2024-04','+','laptop','ASUS ROG Zephyrus G16'],
['2024-08','-','mouse','Razer Mamba Wireless'],['2024-09','-','monitor','MSI Optix G27CQ4 27"'],['2024-09','+','monitor','ASUS ROG Swift PG34WCDM 34"'],
['2024-09','-','phone','Google Pixel 7 Pro'],['2024-09','+','phone','Google Pixel 9 Pro'],['2024-11','-','laptop','ASUS ROG Zephyrus G16'],
['2026-01','+','laptop','Apple MacBook Pro 16" (M4 Pro)'],['2026-03','+','mouse','Logitech MX Master 3S'],
['2026-04','-','desktop','Custom Ryzen 7 3700X / RTX 2070S Build'],['2026-04','+','desktop','iBUYPOWER RDY KING 95 PRO']];
const SPEC = {
  'iBUYPOWER RDY KING 95 PRO': 'i9-14900KF · RTX 5080 16GB · 64GB DDR5 · 4TB NVMe',
  'Custom Ryzen 7 3700X / RTX 2070S Build': 'Ryzen 7 3700X · RTX 2070 SUPER · 64GB DDR4',
  'Custom i7-4790K / GTX 970 Build': 'i7-4790K · GTX 970 4GB · 16GB DDR3',
  'Apple MacBook Pro 16" (M4 Pro)': 'M4 Pro 14-core · 48GB unified · 512GB',
  'ASUS ROG Zephyrus G16': 'Core Ultra 9 185H · RTX 4090 · 240Hz OLED',
  'MSI GE60 0ND-257US': 'i7-3630QM · GTX 660M · 24GB DDR3',
  'ASUS ROG Swift PG34WCDM 34"': '3440×1440 · 240Hz · primary',
  'LG UltraGear 34GP63A-B 34"': '2560×1440 · 160Hz', 'MSI Optix G27CQ4 27"': '2560×1440 · 165Hz',
  'LG 29UM67 29"': '2560×1080', 'ASUS VG248QE 24"': '1920×1080 · 144Hz', 'LG 25UM57 25"': '2560×1080',
  'Corsair STRAFE RGB': 'Cherry MX Brown', 'FILCO Majestouch Convertible 2': 'Cherry MX Brown',
  'Sigma 50mm F1.4 DG HSM Art': '50mm f/1.4'
};
const CATS = [['desktop', 'Desktop'], ['laptop', 'Laptop'], ['monitor', 'Monitors'], ['keyboard', 'Keyboard'], ['mouse', 'Mouse'], ['camera', 'Camera'], ['lens', 'Lenses'], ['phone', 'Phone']];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const JOBS = [
  { co: 'Tern', when: '2026 — now', role: 'Engineer', blurb: 'Currently building at tern.travel.' },
  { co: 'Alpine', when: '2026', role: 'Founding Engineer', blurb: 'Early engineer on Alpine, an AI-native workspace that brings docs, tasks and chat into one app.' },
  { co: 'Beeper · Automattic', when: '2023 — 2025', role: 'Software Engineer', blurb: 'Worked on Beeper, the universal chat app, through its acquisition by Automattic.' },
  { co: 'Netlify', when: '2023', role: 'Engineer & Product Manager', blurb: 'Joined with the Gatsby acquisition and kept the framework moving.' },
  { co: 'Gatsby', when: '2021 — 2023', role: 'Staff Software Engineer → Product Manager', blurb: 'Moved from engineering into product and led the launch of Gatsby 5, shipping the Slice API and Partial Hydration.' },
  { co: 'Duo Security', when: '2017 — 2021', role: 'Software Engineer · Team Lead', blurb: 'Owned critical projects across core systems and led an engineering team.' },
  { co: 'Barracuda', when: '2015 — 2017', role: 'Software Engineer', blurb: 'Where it started — shipping software out of Michigan.' }
];
export { EV, SPEC, CATS, MON, JOBS };
