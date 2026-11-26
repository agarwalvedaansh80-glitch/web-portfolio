/* 3MD Studio: selected projects (text and images from 3mdstudio.net) */
(function () {
  const N = { sultan: 5, family: 5, majles: 5, abudhabi: 5, farmhouse: 4, classical: 4, marina: 5, padel: 4 };
  const gal = s => Array.from({ length: N[s] }, (_, k) => `img/${s}-0${k + 1}.webp`);
  const mk = (slug, t, m, r, s, k, d) => ({ slug, t, m, img: `${slug}-01`, r, s, k, g: gal(slug), d });
  window.PROJECTS = [
    mk('sultan', 'Private Villa', 'Nad Al Sheba, Dubai', ['exterior'],
      'The client wanted a tropical setting, with a modern and open villa.',
      'Architecture · Exterior visualization',
      [['The brief', 'A modern, open villa in Nad Al Sheba, wrapped in a tropical setting of planting, water and shade.'],
       ['The visualization', 'Day and dusk views of the villa, its pool terrace and landscape, built to show the architecture the way it will read on site.']]),
    mk('majles', 'Farm House Majles', 'Doha, Qatar', ['interior', 'hospitality'],
      'An all glass majles for casual gatherings with friends, with a view over the farm and the stable.',
      'Interior design · Interior visualization',
      [['The brief', 'The client is a horse lover. He wanted an all glass majles for casual gatherings with friends, with a view over his farm and stable.'],
       ['The design', 'A jigsaw configuration between the different seating moods, so the space works for a small circle of friends or a full gathering.']]),
    mk('family', 'Private Family Villa', 'Majdelyoun, Lebanon', ['exterior'],
      'A modern villa for a family of five, oriented around a big pool terrace.',
      'Architecture · Exterior visualization',
      [['The brief', 'The clients were a family of five who wanted a modern villa oriented around a big pool terrace.'],
       ['The visualization', 'Exterior views from the garden, the terrace and the street, showing the villa in its landscape.']]),
    mk('abudhabi', 'Villa Interior', 'Abu Dhabi, UAE', ['interior'],
      'A neo classical villa interior in a neutral palette of earthy hues.',
      'Interior design · Interior visualization',
      [['The brief', 'The client wanted a neo classical look for his villa interior.'],
       ['The palette', 'Neutral, earthy hues carried through the living, dining and family spaces.']]),
    mk('marina', 'Apartment 1908, 52|42 Tower', 'Dubai Marina, UAE', ['interior'],
      'A five star apartment designed to stand out as a luxury holiday home facing Ain Dubai.',
      'Interior design · Interior visualization',
      [['The brief', 'The owner wanted to upgrade the interior with premium finishes and furniture, to promote the apartment as a luxurious holiday home facing the iconic Dubai Eye.'],
       ['The design', 'For such a prime location, we designed a five star apartment to stand out among the holiday home options in the Marina.']]),
    mk('classical', 'Classical Fusion Villa', 'Doha, Qatar', ['exterior'],
      'A hybrid of classical and modern elements, with a unique twist to the façade.',
      'Architecture · Façade design',
      [['The brief', 'In this project, the client wanted a hybrid of classical and modern elements.'],
       ['The design', 'We achieved his vision with a unique twist to the façade.']]),
    mk('farmhouse', 'Farm House Interior', 'Dubai, UAE', ['interior'],
      'A contemporary and luxurious interior to complement a modern lifestyle in a farm setting.',
      'Interior design · Interior visualization',
      [['The brief', 'The clients wanted a contemporary and lux interior to complement their modern lifestyle and farm settings.']]),
    mk('padel', 'Padel Tennis Club', 'Abu Dhabi, UAE', ['hospitality', 'exterior'],
      'Club structure and interior for A Team Padel Club, reflecting the modern and social side of the sport.',
      'Architecture · Interior design · Visualization',
      [['The project', 'Padel tennis has become a very trending sport in the Gulf and the UAE specifically. We worked with A Team Padel Club on their club structure and interior.'],
       ['The design', 'A structure and interior that reflect the modern and social aspects of the sport.']])
  ];
})();
