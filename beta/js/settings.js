// ---------- Settings ----------
const CRUISE_KT = 26;                 // ~30 mph
const FUEL_TANK = 215, BURN_LOW = 150, BURN_HIGH = 180, ROUTE_NM_REF = 150; // RJ's numbers for a full crossing
const TZ = 'America/New_York';
const NOAA_TIDE_STATION = '8722670';  // Lake Worth Pier (Palm Beach)

// Route (approximate; check against charts). ocean:true = open-ocean leg where Gulf Stream rules apply.
const WP_OUT = [
  {id:'inlet',  name:'Palm Beach Inlet', lat:26.7722, lon:-80.0301},
  {id:'stream', name:'Gulf Stream',      lat:26.8575, lon:-79.5633, ocean:true},
  {id:'memory', name:'Memory Rock (outside)', lat:26.9134, lon:-79.0907, ocean:true},
  {id:'mangrove',name:'Bank (Mangrove Cay)', lat:26.9726, lon:-78.6657},
  {id:'sale',   name:'Bank (north of Great Sale)', lat:27.0512, lon:-78.2122},
  {id:'crab',   name:'Crab Cay',         lat:26.9336, lon:-77.5967},
  {id:'gtc',    name:'Green Turtle Cay', lat:26.7700, lon:-77.3300},
];
// RJ's own line: his Aug 14, 2026 Garmin track from the inlet to Green Turtle, simplified (~0.05 nm).
const TRACK_OUT = [[26.7722,-80.0301],[26.7759,-79.9835],[26.7859,-79.937],[26.7936,-79.9086],[26.811,-79.8257],[26.8182,-79.7758],[26.8343,-79.6998],[26.8357,-79.6745],[26.8414,-79.6538],[26.8532,-79.5817],[26.8575,-79.5633],[26.8676,-79.4869],[26.8676,-79.4796],[26.8758,-79.433],[26.8859,-79.3307],[26.8964,-79.2483],[26.8984,-79.2029],[26.9029,-79.1744],[26.9052,-79.1432],[26.9134,-79.0907],[26.9153,-79.0435],[26.9244,-78.9662],[26.9437,-78.8487],[26.9484,-78.8087],[26.9555,-78.7699],[26.9618,-78.7107],[26.9726,-78.6657],[26.9875,-78.5862],[27.0169,-78.4519],[27.0237,-78.4077],[27.0437,-78.3084],[27.0467,-78.2836],[27.0512,-78.2122],[27.0478,-78.1434],[27.0451,-78.12],[27.0336,-78.0838],[27.0026,-77.9604],[26.9883,-77.9017],[26.9869,-77.8877],[26.9676,-77.8043],[26.9661,-77.7933],[26.963,-77.7847],[26.9602,-77.7653],[26.9572,-77.7562],[26.9571,-77.7478],[26.9537,-77.7392],[26.953,-77.7206],[26.9507,-77.7136],[26.9502,-77.7039],[26.948,-77.6948],[26.946,-77.6706],[26.9336,-77.5967],[26.9154,-77.5453],[26.9023,-77.5166],[26.8785,-77.4911],[26.863,-77.4772],[26.827,-77.4381],[26.8248,-77.4419],[26.8257,-77.4482],[26.8072,-77.4214],[26.7999,-77.4138],[26.7838,-77.3909],[26.7522,-77.3409],[26.77,-77.33]].map(([lat,lon])=>({lat,lon}));
// Trip home (?trip=home): Guana > Whale Cay > Green Turtle > the same route back to the inlet.
const HOME = new URLSearchParams(location.search).get('trip')==='home';
const WP = HOME ? [
  {id:'guana', name:'Guana Cay', lat:26.6950, lon:-77.1300},
  {id:'whale', name:'Whale Cay Passage', lat:26.7400, lon:-77.1900},
  ...WP_OUT.slice().reverse()
] : WP_OUT;
const TRACK = HOME ? [WP[0],WP[1],...TRACK_OUT.slice().reverse()] : TRACK_OUT;
const ORIG = WP[0].name, DEST = WP[WP.length-1].name;
const GTI = WP.findIndex(p=>p.id==='gtc');
// Extra forecast points (not on the run line)
const INSIDE = {name:'Sea of Abaco (inside)', lat:26.7000, lon:-77.2000};
const WHALE  = {name:'Whale Cay (outside)',   lat:26.7400, lon:-77.1700};

