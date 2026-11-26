/* Shawa Architecture: selected projects (text and images from Shawa Architecture) */
(function () {
  const N = { 'dubai-hills-villa': 3, 'serina-lobby': 5, 'seslia-tower': 4, 'private-villas': 5, 'interior-design': 5, 'public-buildings': 4, 'futuristic-designs': 4, 'residential-towers': 4 };
  const gal = s => Array.from({ length: N[s] }, (_, k) => `xl/${s}-0${k + 1}.webp`);
  const mk = (slug, t, m, r, s, k, d) => ({ slug, t, m, img: `${slug}-01`, r, s, k, g: gal(slug), d });
  window.PROJECTS = [
    mk('dubai-hills-villa', 'Dubai Hills Villa', 'Dubai Hills, Dubai', ['villas'],
      'A villa designed to be iconic inside and out, with a futuristic elevation and a custom parametric pattern that lets daylight through and continues into the landscape.',
      'Villa · Architectural design, modeling, rendering and supervision · Built 2022',
      [['The project', 'Shawa Architecture designed this villa with the thought of making it as iconic as possible, both inside and outside. It stands out in the luxury community of Dubai Hills thanks to the creative, futuristic look of its elevation, immensely large windows and a strictly light palette.'],
       ['The pattern', 'A custom-designed parametric pattern lets daylight pass through the facade and is carried into the landscape, tying the architecture and the garden together.'],
       ['Facts', 'Plot area 1,300 sqm. Basement, ground, first floor and roof. Year 2022. Status: built.']]),
    mk('serina-lobby', 'Serina Building', 'Dubai', ['interior'],
      'Lobby, gym, pool and corridors for a residential building, where dark walls, floors and ceilings meet light, artful installations.',
      'Residential building · Public area interior design',
      [['The project', 'Serina is a residential building in Dubai where the focus is on sleek luxury, brought out by the contrast of dark walls, floors and ceilings with light, artful installations. Shawa Architecture designed all of the public areas: the lobby, gym, swimming pool and corridors.'],
       ['The concept', 'Inspired by modern art connected with nature: the lobby wall takes the black and white stripes of a zebra, while the reception table is inspired by African masks, finished in polished metal for a liquid look.']]),
    mk('seslia-tower', 'Seslia Tower', 'Dubai', ['towers'],
      'A residential tower with offices on the lower floors, designed around the beauty of raw materials and an industrial palette of grey, brown and black.',
      'Residential and offices · Architectural design, modeling, rendering and supervision · 2022',
      [['The project', 'With a vision of industrial style in mind, the building was designed to be as functional as possible while showcasing the beauty of raw materials and their contrasts. The industrial approach runs through all of the public areas, immersing visitors in a creative, modern atmosphere.'],
       ['Facts', 'Plot area 3,010 sqm. Ground, four podium levels and 36 floors. Residential and offices. Year 2022. Status: under construction.']]),
    mk('private-villas', 'Private Villas', 'UAE', ['villas'],
      'Contemporary private villas with bold volumes, deep shadows and generous glazing, each shaped around its owner and plot.',
      'Villas · Architecture and exterior design',
      [['The work', 'A selection of contemporary villa designs by Shawa Architecture: strong horizontal volumes, cantilevered roofs, stone and timber cladding and full-height glass, composed to bring daylight and views into every room.']]),
    mk('interior-design', 'Interior Design', 'Dubai', ['interior'],
      'Lobbies, lounges, offices and residences where modern art and natural elements meet light, texture and colour.',
      'Interiors · Residential, hospitality and commercial',
      [['The work', 'Interior design for lobbies, lounges, offices, gyms and homes. The studio often draws on modern art and the elements of nature, giving each space its own sculptural centrepiece.']]),
    mk('public-buildings', 'Public Buildings', 'UAE and the region', ['public'],
      'Civic, cultural and commercial buildings across Dubai, Abu Dhabi, Mecca and Doha, from mosques and museums to sports venues.',
      'Public buildings · Architectural design',
      [['The work', 'Public and commercial architecture across the UAE, Saudi Arabia and Qatar, including a police analysis building, an iconic mosque concept, sports venues, museums, offices and mixed use developments.']]),
    mk('futuristic-designs', 'Futuristic Designs', 'Concept architecture', ['public'],
      'Visionary architecture driven by technology and nature, including the Story of UAE museum concept with sculptures displayed underwater.',
      'Futuristic design · Architectural technology',
      [['The work', 'Driven by innovation, the studio applies state of the art technology to pursue new horizons in design. Our Head Architect Amer Shawa presented the Story of UAE museum at the Sheikha Manal Young Artist Award, where it was shortlisted from 110 architecture submissions and displayed at City Walk for a week.'],
       ['The museum idea', 'Unlike traditional indoor pavilions, the objects would be displayed in an underwater environment, with visitors passing through an underwater tunnel that tells the story of the UAE chronologically.']]),
    mk('residential-towers', 'Residential Towers', 'Dubai', ['towers'],
      'High-rise residences shaped by light, views and a clear architectural identity on the Dubai skyline.',
      'Residential buildings · Architectural design',
      [['The work', 'Residential towers designed from concept to rendering, balancing functionality with aesthetic value, and planned strategically for the way residents live.']])
  ];
})();
