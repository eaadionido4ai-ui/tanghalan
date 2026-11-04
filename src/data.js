// The visitors' animal avatars and the four pillars' colors, as in the BAYANIHanda Game Library (src/data.js).

export const AV = [
  { id: 'turtle', e: '🐢', bg: '#cdebe0' }, { id: 'eagle', e: '🦅', bg: '#ffe1c4' }, { id: 'dragon', e: '🐉', bg: '#d9ccf6' }, { id: 'butterfly', e: '🦋', bg: '#ffd9df' },
  { id: 'whale', e: '🐋', bg: '#d6ecff' }, { id: 'frog', e: '🐸', bg: '#e4f0c4' }, { id: 'cat', e: '🐱', bg: '#ffe9b8' }, { id: 'fox', e: '🦊', bg: '#ffd9c4' },
];

export const av = (id) => AV.find((a) => a.id === id) || null;

export const P = {
  mit: { id: 'mit', name: 'Stop Hazards Early', sub: 'Prevention and Mitigation', icon: '🛡️', text: '#2a6b8f', ring: '#2a6b8f', grad: 'linear-gradient(135deg,#6db4d6,#2a6b8f)', banner: 'linear-gradient(135deg,#3f8fb5,#1f5675)', border: '#bfe0ef', tint: '#e6f3f9', lead: 'Spot dangers before they happen and stop them from turning into disasters.' },
  prep: { id: 'prep', name: 'Get Ready', sub: 'Preparedness', icon: '🎒', text: '#128253', ring: '#128253', grad: 'linear-gradient(135deg,#5fd39b,#128253)', banner: 'linear-gradient(135deg,#1e9c66,#0c5c3a)', border: '#bfe9d4', tint: '#e5f6ee', lead: 'Get your family and your go bag ready before anything happens.' },
  resp: { id: 'resp', name: 'Act Fast', sub: 'Response', icon: '🚨', text: '#b35205', ring: '#e8700b', grad: 'linear-gradient(135deg,#ffb04d,#f2760c)', banner: 'linear-gradient(135deg,#e06a0a,#a84d04)', border: '#ffd9ad', tint: '#fff1e3', lead: 'Learn what to do in the first minutes when a disaster strikes.' },
  rec: { id: 'rec', name: 'Bounce Back', sub: 'Recovery and Rehabilitation', icon: '🏘️', text: '#7a53c6', ring: '#7a53c6', grad: 'linear-gradient(135deg,#c3a6ff,#7a53c6)', banner: 'linear-gradient(135deg,#8c66d9,#5a3a9e)', border: '#ddcdfa', tint: '#f1ebfd', lead: 'After a disaster, help your home and your community bounce back.' },
};
