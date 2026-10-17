/* Vesper & Wick — product data (single source for the preview site, the renders and the Shopify CSV) */
(function (root) {
  var P = [
    {
      slug: 'ember-hour', name: 'Ember Hour', type: 'candle', feel: 'Smoky', no: '01',
      line: 'The last log, the first quiet.',
      desc: 'Black pepper struck over smoked birch, settling into vetiver and a little tonka. It smells like the hour after the fire has done its work.',
      accent: '#d9622b', glass: '#94501f', glassKind: 'amber', wax: '#efe2cf',
      notes: {
        top: [['Black pepper', 70, 'spice'], ['Bergamot', 40, 'citrus']],
        heart: [['Smoked birch', 90, 'smoke'], ['Labdanum', 60, 'resin']],
        base: [['Vetiver', 72, 'wood'], ['Tonka', 45, 'gourmand']]
      },
      variants: [{ name: 'Classic · 300 g', size: '300 g', burn: '60 h', price: 38, grams: 520 }, { name: 'Travel · 120 g', size: '120 g', burn: '25 h', price: 28, grams: 240 }],
      quiz: { mood: { moody: 3, cosy: 2 }, room: { living: 3, study: 1 }, season: { autumn: 2, winter: 3 } },
      pair: 'rain-on-stone'
    },
    {
      slug: 'night-reading', name: 'Night Reading', type: 'candle', feel: 'Smoky', no: '02',
      line: 'Leather spines, a lamp, one more chapter.',
      desc: 'Clove and bergamot open onto an old-paper accord and soft leather, then oud and cured tobacco leaf. Dark, dry and very still.',
      accent: '#a5453f', glass: '#151113', glassKind: 'black', wax: '#2b2727',
      notes: {
        top: [['Clove', 45, 'spice'], ['Bergamot', 35, 'citrus']],
        heart: [['Old paper', 70, 'musk'], ['Leather', 82, 'smoke']],
        base: [['Oud', 76, 'wood'], ['Tobacco leaf', 60, 'gourmand']]
      },
      variants: [{ name: 'Classic · 300 g', size: '300 g', burn: '62 h', price: 42, grams: 540 }, { name: 'Travel · 120 g', size: '120 g', burn: '26 h', price: 32, grams: 250 }],
      quiz: { mood: { moody: 3, calm: 1 }, room: { study: 3, bedroom: 1 }, season: { winter: 2, autumn: 3 } },
      pair: 'rain-on-stone'
    },
    {
      slug: 'fig-ledger', name: 'Fig Ledger', type: 'candle', feel: 'Cosy', no: '03',
      line: 'Green fig, warm wood, late September.',
      desc: 'Crushed fig leaf and cardamom over a milky fig heart, with sandalwood and benzoin underneath. Green on top, soft as a jumper below.',
      accent: '#8a9a55', glass: '#6d7d4a', glassKind: 'green', wax: '#e4e2c9',
      notes: {
        top: [['Fig leaf', 80, 'green'], ['Cardamom', 45, 'spice']],
        heart: [['Fig milk', 70, 'gourmand'], ['Cashmere wood', 50, 'wood']],
        base: [['Sandalwood', 62, 'wood'], ['Benzoin', 40, 'resin']]
      },
      variants: [{ name: 'Classic · 300 g', size: '300 g', burn: '58 h', price: 36, grams: 520 }, { name: 'Travel · 120 g', size: '120 g', burn: '24 h', price: 28, grams: 240 }],
      quiz: { mood: { cosy: 3, calm: 2 }, room: { living: 2, study: 2 }, season: { summer: 2, autumn: 3 } },
      pair: 'cold-garden'
    },
    {
      slug: 'cashmere-dusk', name: 'Cashmere Dusk', type: 'candle', feel: 'Cosy', no: '04',
      line: 'Saffron light through drawn curtains.',
      desc: 'Mandarin and saffron, then vanilla orchid and suede, resting on warm amber and a skin-close cashmere musk. Our slowest, softest pour.',
      accent: '#c48a5c', glass: '#d6a48c', glassKind: 'blush', wax: '#ecd4ab',
      notes: {
        top: [['Mandarin', 50, 'citrus'], ['Saffron', 60, 'spice']],
        heart: [['Vanilla orchid', 75, 'gourmand'], ['Suede', 55, 'musk']],
        base: [['Amber', 80, 'resin'], ['Cashmere musk', 60, 'musk']]
      },
      variants: [{ name: 'Classic · 300 g', size: '300 g', burn: '60 h', price: 40, grams: 530 }, { name: 'Travel · 120 g', size: '120 g', burn: '25 h', price: 30, grams: 245 }],
      quiz: { mood: { cosy: 3, moody: 1 }, room: { bedroom: 3, living: 1 }, season: { winter: 3, autumn: 1 } },
      pair: 'rain-on-stone'
    },
    {
      slug: 'salt-linen', name: 'Salt Linen', type: 'candle', feel: 'Clean', no: '05',
      line: 'Sheets dried on a line by the sea.',
      desc: 'Bright aldehydes and bergamot over a linen musk with a cool thread of iris, finished with white cedar and ambrette. Clean without the soap.',
      accent: '#7f98a6', glass: '#f2f4f2', glassKind: 'clear', wax: '#f5f2ec',
      notes: {
        top: [['Aldehydes', 60, 'aquatic'], ['Bergamot', 45, 'citrus']],
        heart: [['Linen musk', 82, 'musk'], ['Iris', 50, 'floral']],
        base: [['White cedar', 55, 'wood'], ['Ambrette', 45, 'musk']]
      },
      variants: [{ name: 'Classic · 300 g', size: '300 g', burn: '55 h', price: 34, grams: 510 }, { name: 'Travel · 120 g', size: '120 g', burn: '23 h', price: 28, grams: 235 }],
      quiz: { mood: { calm: 3, awake: 2 }, room: { bedroom: 2, bath: 3 }, season: { spring: 2, summer: 2 } },
      pair: 'cold-garden'
    },
    {
      slug: 'first-frost', name: 'First Frost', type: 'candle', feel: 'Fresh', no: '06',
      line: 'A cold morning walk, breath you can see.',
      desc: 'Juniper and eucalyptus over crushed fir needle and a little mint, held down by frankincense and ambroxan. Wakes a room up.',
      accent: '#5f9a8a', glass: '#e9efec', glassKind: 'frosted', wax: '#e3eee8',
      notes: {
        top: [['Juniper', 70, 'green'], ['Eucalyptus', 65, 'herbal']],
        heart: [['Fir needle', 80, 'wood'], ['Mint', 40, 'herbal']],
        base: [['Frankincense', 60, 'resin'], ['Ambroxan', 50, 'musk']]
      },
      variants: [{ name: 'Classic · 300 g', size: '300 g', burn: '56 h', price: 36, grams: 515 }, { name: 'Travel · 120 g', size: '120 g', burn: '24 h', price: 28, grams: 238 }],
      quiz: { mood: { awake: 3, calm: 1 }, room: { bath: 2, study: 2 }, season: { winter: 2, spring: 1 } },
      pair: 'cold-garden'
    },
    {
      slug: 'rain-on-stone', name: 'Rain on Stone', type: 'mist', feel: 'Clean', no: 'M1',
      line: 'The first minute of a summer storm.',
      desc: 'A petrichor accord and pink grapefruit over wet stone and iris, drying down to white musk and cedar. Four sprays reset a room.',
      accent: '#8e9a95', glass: '#7f9aa3', glassKind: 'tint', wax: '#dfe6e3',
      notes: {
        top: [['Petrichor', 78, 'aquatic'], ['Pink grapefruit', 40, 'citrus']],
        heart: [['Wet stone', 70, 'mineral'], ['Iris', 45, 'floral']],
        base: [['White musk', 60, 'musk'], ['Cedarwood', 40, 'wood']]
      },
      variants: [{ name: '100 ml', size: '100 ml', burn: '≈ 400 sprays', price: 22, grams: 310 }],
      quiz: { mood: { calm: 2, awake: 2 }, room: { bath: 2, bedroom: 2 }, season: { spring: 3, summer: 1 } },
      pair: 'salt-linen'
    },
    {
      slug: 'cold-garden', name: 'Cold Garden', type: 'mist', feel: 'Fresh', no: 'M2',
      line: 'Tomato leaves snapped at dawn.',
      desc: 'Tomato leaf and petitgrain, violet leaf and cut grass, a soft floor of oakmoss and musk. Sharp, green and gone in a good way.',
      accent: '#7f9d4f', glass: '#9fb58a', glassKind: 'green', wax: '#d8e6c4',
      notes: {
        top: [['Tomato leaf', 85, 'green'], ['Petitgrain', 55, 'citrus']],
        heart: [['Violet leaf', 60, 'green'], ['Cut grass', 70, 'green']],
        base: [['Oakmoss', 50, 'wood'], ['White musk', 35, 'musk']]
      },
      variants: [{ name: '100 ml', size: '100 ml', burn: '≈ 400 sprays', price: 24, grams: 310 }],
      quiz: { mood: { awake: 3, cosy: 1 }, room: { living: 1, study: 1, bath: 1 }, season: { summer: 3, spring: 2 } },
      pair: 'ember-hour'
    }
  ];
  P.forEach(function (p) { p.price = p.variants[0].price; p.size = p.variants[0].size; p.burn = p.variants[0].burn; });
  var FAMILY = { citrus: '#e2b34a', spice: '#d9622b', wood: '#9a7650', smoke: '#8d8580', resin: '#c27a3a', gourmand: '#c9a27a', green: '#7fa05a', herbal: '#6fa38e', musk: '#cbbfb2', floral: '#b98aa6', aquatic: '#86a7b8', mineral: '#9aa29a' };
  var api = { products: P, family: FAMILY, freeShip: 50, bySlug: function (s) { return P.filter(function (p) { return p.slug === s; })[0]; } };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.VW = api;
})(this);
