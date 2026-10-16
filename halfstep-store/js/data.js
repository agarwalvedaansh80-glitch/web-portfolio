// Product data for the prototype. In the Shopify theme this comes from the product object.
export const PRICE = 140;
export const FREE_SHIP = 120;
export const COLOURWAYS = [
  { id: 'street',   name: 'Night Shift', sw: '#1d1d1f', cw: '#F2546B', ink: '#000', stock: 'In stock' },
  { id: 'midnight', name: 'Harbour',     sw: '#1B7FC0', cw: '#1B7FC0', ink: '#fff', stock: 'In stock' },
  { id: 'beach',    name: 'Dusk',        sw: '#D9AEB4', cw: '#C98A93', ink: '#000', stock: 'Low stock' },
  { id: 'moss',     name: 'Moss',        sw: '#6B7A35', cw: '#7D8C3E', ink: '#fff', stock: 'In stock' },
  { id: 'chalk',    name: 'Chalk',       sw: '#ECECE8', cw: '#3C3F3A', ink: '#fff', stock: 'In stock' },
  { id: 'ember',    name: 'Ember',       sw: '#E0602A', cw: '#E0602A', ink: '#000', stock: 'Drops Saturday', soon: true },
];
export const SIZES = ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11', 'UK 12', 'UK 13'];
export const SOLD_OUT = { street: ['UK 13'], beach: ['UK 6', 'UK 12'], midnight: [], moss: ['UK 7'], chalk: [], ember: SIZES };
export const byId = (id) => COLOURWAYS.find((c) => c.id === id);
