// Product data for the static preview. In the Shopify theme this comes from the product object + theme settings.
// sw = swatch (the knit colour), acid = the accent that floods the UI when this colourway is picked, ink = text on acid.
export const PRICE = 140;
export const FREE_SHIP = 120;
export const COLOURWAYS = [
  { id: 'street',   name: 'Night Shift', sw: '#1d1d1f', acid: '#FF4D8D', ink: '#000', desc: 'Black knit, coral stripes', tag: 'Best seller', stock: 'In stock' },
  { id: 'midnight', name: 'Harbour',     sw: '#1B7FC0', acid: '#3A5BFF', ink: '#fff', desc: 'Sea blue, navy stripes', tag: '', stock: 'In stock' },
  { id: 'beach',    name: 'Dusk',        sw: '#D9AEB4', acid: '#C9A6FF', ink: '#000', desc: 'Blush knit, rose stripes', tag: 'Low stock', stock: 'Low stock' },
  { id: 'moss',     name: 'Moss',        sw: '#6B7A35', acid: '#C8FF2E', ink: '#000', desc: 'Olive knit, gum stripes', tag: '', stock: 'In stock' },
  { id: 'chalk',    name: 'Chalk',       sw: '#ECECE8', acid: '#FFE81F', ink: '#000', desc: 'Off-white knit, black stripes', tag: '', stock: 'In stock' },
  { id: 'ember',    name: 'Ember',       sw: '#E0602A', acid: '#FF5B14', ink: '#000', desc: 'Burnt orange, black stripes', tag: 'Drops Saturday', stock: 'Drops Saturday', soon: true },
];
export const SIZES = ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11', 'UK 12', 'UK 13'];
export const SOLD_OUT = { street: ['UK 13'], beach: ['UK 6', 'UK 12'], midnight: [], moss: ['UK 7'], chalk: [], ember: SIZES };
export const byId = (id) => COLOURWAYS.find((c) => c.id === id);
