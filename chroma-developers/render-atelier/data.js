/* Render Atelier: selected projects (text and renders from renderatelier.com) */
(function () {
  const N = { tissoli: 4, redsea: 5, acres: 5, mandarin: 4, everly: 5, seef: 5, corniche: 5, altiera: 5 };
  const gal = s => Array.from({ length: N[s] }, (_, k) => `xl/${s}-0${k + 1}.webp`);
  const mk = (slug, t, m, r, s, k, d) => ({ slug, t, m, img: `${slug}-01`, r, s, k, g: gal(slug), d });
  window.PROJECTS = [
    mk('everly', 'Ellington Everly Place', 'Meydan Horizon, Dubai', ['exterior'],
      'In MBR City, the crystal lagoon is the address. Launch images for Ellington Properties’ collection of 209 design led residences, set directly on the lagoon’s edge.',
      'Ellington Properties · Exterior architectural visualization',
      [['The project', 'Everly Place, Ellington Properties’ collection of 209 design led residences at Meydan Horizon, sits directly on the lagoon’s edge, minutes from Downtown Dubai, Dubai Creek Harbour and the Ras Al Khor Wildlife Sanctuary. The building is composed as two interlocking residential wings in warm stone and bronze, with deep planted balconies and floor to ceiling glazing, all turned to face the water.'],
       ['The visualization', 'Ellington commissioned Render Atelier for the exterior architectural visualization, a set of launch images that had to show a design led developer’s building and, just as importantly, the lagoon lifestyle it was designed around. In a district crowded with off plan launches, exterior 3D rendering is how one building earns the buyer’s second look.']]),
    mk('tissoli', 'Palazzo Tissoli by Pininfarina', 'Al Marjan Island, RAK', ['exterior'],
      'Exterior renderings that capture the refined essence of coastal architecture at Al Marjan Island, designed by the world renowned Italian design firm Pininfarina.',
      'Exterior and amenities visualization',
      [['The project', 'Render Atelier’s exterior renderings of Palazzo Tissoli, designed by the world renowned Italian design firm Pininfarina, capture the refined essence of coastal architecture at Al Marjan Island. These visuals embody artistic precision and expert 3D rendering marketing for Ras Al Khaimah’s luxury real estate scene.'],
       ['The visualization', 'Our exterior work showcases sleek façades, modern geometry and Italian inspired details that harmonize with the island’s waterfront setting. The result: exterior imagery that defines elegance, investment appeal and timeless Mediterranean sophistication on the Arabian Gulf.']]),
    mk('redsea', 'Red Sea Development', 'Saudi Arabia', ['interior', 'hospitality'],
      'Interior 3D renderings for a prestigious project in Saudi Arabia, fusing Middle Eastern elegance with global expertise.',
      'Interior 3D rendering · Luxury hospitality',
      [['Fusing Middle Eastern elegance with global expertise', 'Collaborating with a prominent New York based interior design studio, Render Atelier was entrusted with the creation of a series of interior 3D architectural renderings for their prestigious project in Saudi Arabia. Our CGI brought to life the Middle Eastern inspired design, seamlessly combining the essence of the region with a touch of global sophistication.'],
       ['Unveiling luxury in the Red Sea Area', 'Our expertise extended to a luxury hospitality project for a major hotel operator in the Red Sea Area, with 3D architectural visualizations that captured every detail with stunning realism.']]),
    mk('mandarin', 'Mandarin Oriental, Vienna', 'Vienna, Austria', ['interior', 'hospitality'],
      'The pre-opening visualization package for Mandarin Oriental’s Austrian debut, in a restored early 20th century courthouse on the Ringstrasse.',
      'Mandarin Oriental · Luxury hotel interior visualization',
      [['The brief', 'When Mandarin Oriental commissioned Render Atelier ahead of its Austrian debut, the brief was to produce interior visualization that would represent the hotel’s rooms and dining spaces with complete fidelity to the brand’s established visual language, before a single guest had checked in. The interior design by London based studio Goddard Littlefair draws on Secessionist detail and bespoke neutral palette furnishings.'],
       ['The package', 'The package spans the hotel’s primary suite categories and its specialty restaurant. The Royal Suite imagery captures spaces that are simultaneously grand in proportion and intimate in detail, while the Penthouse Suite living room extends this into a larger format space within the architectural volume of a historic building.']]),
    mk('acres', 'The Acres', 'Dubai', ['exterior'],
      'Visualizing a nature led community: spring inspired waterways, gardens and green open spaces around contemporary villas.',
      'Meraas · Architectural visualization',
      [['The project', 'The Acres is designed to bring the feeling of a countryside retreat into everyday life. Natural spring inspired waterways, gardens and green open spaces surround the contemporary villas, creating a calm and connected neighbourhood.'],
       ['What we built', 'Render Atelier developed the visualizations to present the project as one connected neighbourhood, showing how the architecture and landscape work together. Small details, from the movement of the water to the natural stone edges and soft cloud cover, were developed to make every scene feel believable and true to the character of the project.']]),
    mk('seef', 'Seef Residences by Alef', 'Al Khan, Sharjah', ['exterior'],
      'Launch imagery for a beachfront project whose single greatest asset, its position on the water, had to be understood in one glance.',
      'Alef Group · Beachfront architectural visualization',
      [['The project', 'Set where Sharjah’s lagoon opens to the Arabian Gulf, minutes from the Dubai border at Al Mamzar, Seef Residences is a cluster of mid rise residential towers arranged around a private garden courtyard, with each building turned towards the sea and the lagoon and a private beach held between two rock breakwaters.'],
       ['The visualization', 'When Alef Group commissioned Render Atelier for the exterior architectural visualization, the brief was clear: produce the launch imagery for an off plan project whose single greatest asset, its position on the water, had to be understood in one glance.']]),
    mk('corniche', 'Corniche Food Hall', 'Gulf Corniche', ['exterior', 'hospitality'],
      'A circular destination building on the waterfront, designed around a single bold idea: that a food hall could become a landmark.',
      'Exterior visualization programme',
      [['The project', 'A disc of glass, cascading greenery and illuminated structural fins sitting in a landscaped corniche park, drawing the city towards it rather than receding into the urban fabric behind.'],
       ['The visualization', 'Render Atelier was commissioned to produce the complete exterior visualisation programme for this project, from aerial perspectives at dusk capturing the building’s circular form from above to views at street level.']]),
    mk('altiera', 'Altiera Heights', 'Jumeirah Islands, Dubai', ['exterior'],
      'Photoreal exterior visualizations that establish the architecture, setting and identity of the development in a single frame.',
      'Ellington Properties · Exterior visualization',
      [['The project', 'Before buyers can experience a residential tower in person, its exterior imagery has to establish the architecture, setting and identity of the development in a single frame. Render Atelier worked with Ellington Properties to create photoreal exterior visualizations for Altiera Heights in Jumeirah Islands, Dubai.'],
       ['What we built', 'The imagery focused on the tower’s architectural form, façade detailing, material response, lighting and relationship with the surrounding urban and landscaped context. The brief required the tower to feel distinctive without disconnecting it from the setting around it.']])
  ];
})();
