const imgs = (page, idx) => idx.map(i => `/img/p${page}_${i}.jpeg`);
const range = n => [...Array(n).keys()];

const XP_NOTE = 'The GPS mount is not sold separately. It comes with the compatible Hero Xpulse 210 windshield because it requires minor modifications during the windshield installation.';
const RE_NOTE = 'Windshield is optional. Tick one windshield below to add it, or leave both unticked for the mount only.';
// Same group = only one can be chosen.
const WS450 = { id: 'ws450', name: 'Original Himalayan 450 Touring Windshield', price: 3220, group: 'ws' };
const WS450S = { id: 'ws450s', name: 'Stock Himalayan 450 Windshield (Short)', price: 850, group: 'ws' };

const xpulseKit = (slug, bike, brand, page, n) => ({
  slug, bike, brand, page, n,
  title: `${bike} GPS Mount + Xpulse 210 Windshield Kit`,
  compat: 'Compatible with Hero Xpulse 210 windshield',
  price: 3850, mrp_breakdown: 'GPS Mount ₹3300 + Windshield ₹550', note: XP_NOTE, addons: []
});
const re450 = (slug, bike, brand, page, n) => ({
  slug, bike, brand, page, n,
  title: `${bike} GPS Mount (RE 450 Touring type)`,
  compat: 'Compatible with RE Himalayan 450 Touring windshield',
  price: 2500, mrp_breakdown: 'GPS Mount ₹2500', note: RE_NOTE, addons: [WS450, WS450S]
});

const list = [
  xpulseKit('scrambler-400-xpulse', 'Triumph Scrambler 400X/XC', 'Triumph', 1, 7),
  re450('scrambler-400-re450', 'Triumph Scrambler 400X/XC', 'Triumph', 2, 7),
  xpulseKit('speed-400-xpulse', 'Triumph Speed 400', 'Triumph', 3, 6),
  re450('speed-400-re450', 'Triumph Speed 400', 'Triumph', 4, 6),
  xpulseKit('t4-xpulse', 'Triumph Speed T4', 'Triumph', 5, 4),
  { ...re450('t4-re450', 'Triumph Speed T4', 'Triumph', 6), idx: [1, 2, 3, 4] },
  re450('re-scram-440-411', 'RE Scram 440 / 411', 'Royal Enfield', 7, 4),
  re450('re-hunter-350', 'RE Hunter 350', 'Royal Enfield', 8, 5),
  { ...re450('re-guerrilla-450', 'RE Guerrilla 450', 'Royal Enfield'), price: 2800, mrp_breakdown: 'GPS Mount ₹2800',
    images: [0, 1, 2, 3, 4, 5, 6, 7].map(i => `/img/guerrilla450_${i}.jpeg`) },
  { slug: 're-meteor-350', bike: 'RE Meteor 350', brand: 'Royal Enfield', page: 9, n: 6,
    title: 'RE Meteor 350 GPS Mount', compat: 'Compatible with RE Meteor 350 windshield only',
    price: 1800, mrp_breakdown: 'GPS Mount ₹1800', note: '', addons: [] },
  { slug: 'hero-xpulse-200', bike: 'Hero Xpulse 200 / 4V / Rally Pro', brand: 'Hero', page: 10, n: 5,
    title: 'Hero Xpulse 200 / 4V / Rally Pro GPS Mount', compat: 'Compatible with Hero Xpulse 200 windshield',
    price: 1700, mrp_breakdown: 'GPS Mount ₹1700', note: '', addons: [] },
  { slug: 'hero-xpulse-210', bike: 'Hero Xpulse 210', brand: 'Hero', page: 11, n: 8,
    title: 'Hero Xpulse 210 GPS Mount', compat: 'Compatible with Hero Xpulse 210 windshield',
    price: 1, mrp_breakdown: 'GPS Mount (test price)', note: '',
    // ₹550 = Xpulse 210 windshield price from the kit breakdown (GPS Mount ₹3300 + Windshield ₹550).
    addons: [{ id: 'ws', name: 'Hero Xpulse 210 Windshield', price: 550 }] },
  { slug: 're-himalayan-411', bike: 'RE Himalayan 411 (BS3/BS4/BS6)', brand: 'Royal Enfield', page: 12, n: 5,
    title: 'RE Himalayan 411 GPS Mount', compat: 'Compatible with Himalayan 411 BS4/BS6 (up to 2021) windshield',
    price: 1500, mrp_breakdown: 'GPS Mount ₹1500', note: 'Windshield is optional. Tick one below to add it, or leave both unticked for the mount only.',
    // Windshield prices as listed for the Classic mounts (same RE Himalayan 411 windshields).
    addons: [{ id: 'ws4', name: 'RE Himalayan 411 BS4 Windshield', price: 580, group: 'ws' },
      { id: 'ws6', name: 'RE Himalayan BS6 Windshield', price: 680, group: 'ws' }],
    variants: ['BS3', 'BS4', 'BS6'] }, // fitting differs per BS version; same price
  { slug: 're-classic-reborn', bike: 'RE Classic 350 Reborn', brand: 'Royal Enfield', page: 13, idx: [0, 4, 1],
    title: 'RE Classic 350 (Reborn) GPS Mount', compat: 'Compatible with RE Himalayan BS6 windshield',
    price: 2200, mrp_breakdown: 'GPS Mount ₹2200', note: '',
    addons: [{ id: 'ws', name: 'RE Himalayan BS6 Windshield', price: 680 }] },
  { slug: 're-classic-uce', bike: 'RE Classic 350 / Bullet (UCE)', brand: 'Royal Enfield', page: 13, idx: [2, 3, 5],
    title: 'RE Classic 350 / Bullet (UCE) GPS Mount', compat: 'Compatible with RE Himalayan 411 BS4 windshield',
    price: 2200, mrp_breakdown: 'GPS Mount ₹2200', note: '',
    addons: [{ id: 'ws', name: 'RE Himalayan 411 BS4 Windshield', price: 580 }] },
  // A price of 0 would show "Price on request" with a WhatsApp button instead of Add to Cart.
  { slug: 'himalayan-450-touring-windshield', bike: 'Himalayan 450 Touring Windshield', brand: 'Royal Enfield',
    title: 'Original Royal Enfield Himalayan 450 Touring Windshield', compat: 'Our RE 450 Touring type GPS mounts: Triumph Scrambler 400X/XC, Speed 400, Speed T4, RE Scram 440 / 411, RE Hunter 350, RE Guerrilla 450',
    price: 3220, mrp_breakdown: 'Windshield ₹3220', note: '', addons: [], kind: 'windshield',
    images: ['/img/hw450_0.jpeg'] },
  { slug: 'himalayan-450-stock-short-windshield', bike: 'Himalayan 450 Stock Windshield (Short)', brand: 'Royal Enfield',
    title: 'Stock Royal Enfield Himalayan 450 Windshield (Short)', compat: 'Our RE 450 Touring type GPS mounts: Triumph Scrambler 400X/XC, Speed 400, Speed T4, RE Scram 440 / 411, RE Hunter 350, RE Guerrilla 450',
    price: 850, mrp_breakdown: 'Windshield ₹850', note: '', addons: [], kind: 'windshield',
    images: ['/img/hw450_1.jpeg'] }
];

module.exports = list.map(({ page, n, idx, ...p }) => ({ ...p, images: p.images || imgs(page, idx || range(n)) }));

// Full-bike photo shown first on each card (index into that product's image list).
const COVER = { 'scrambler-400-xpulse': 3, 'scrambler-400-re450': 4, 'speed-400-xpulse': 5, 'speed-400-re450': 4,
  't4-xpulse': 2, 't4-re450': 2, 're-hunter-350': 1, 're-meteor-350': 1, 'hero-xpulse-200': 3 };
module.exports.forEach(p => {
  const c = COVER[p.slug];
  if (c) p.images = [p.images[c], ...p.images.filter((_, i) => i !== c)];
});
