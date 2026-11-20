// ---------- Helpers ----------
const $ = id => document.getElementById(id);
const toRad = d => d*Math.PI/180;
function nm(a,b){const R=3440.065,dLat=toRad(b.lat-a.lat),dLon=toRad(b.lon-a.lon);const x=Math.sin(dLat/2)**2+Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(x));}
// Distances run along the real track; each waypoint sits at its nearest track point.
const tcum=[0];for(let i=1;i<TRACK.length;i++)tcum.push(tcum[i-1]+nm(TRACK[i-1],TRACK[i]));
const nearestT=p=>{let b=0,bd=1e9;TRACK.forEach((q,i)=>{const dd=nm(p,q);if(dd<bd){bd=dd;b=i;}});return b;};
const cum=WP.map((p,i)=>i===0?0:i===WP.length-1?tcum[tcum.length-1]:tcum[nearestT(p)]);
const TOTAL_NM = tcum[tcum.length-1];
const dirName = d => d==null?'–':['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'][Math.round(d/22.5)%16];
const isNorthish = d => d!=null && (d>=300 || d<=60);
const fmtT = d => d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:TZ});
const fmtDay = d => d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',timeZone:TZ});
function etParts(d){const p=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hour12:false}).formatToParts(d);const o={};p.forEach(x=>o[x.type]=x.value);return o;}
function etKey(d){const o=etParts(d);return `${o.year}-${o.month}-${o.day}T${o.hour==='24'?'00':o.hour}:00`;}
function etDate(d){const o=etParts(d);return `${o.year}-${o.month}-${o.day}`;}
// Build a Date for a given ET day + local hours (handles EST/EDT via offset probe)
function etTime(dayStr, hours){const [y,m,dd]=dayStr.split('-').map(Number);const noon=new Date(Date.UTC(y,m-1,dd,17));const etHour=+etParts(noon).hour%24;const offset=17-etHour;return new Date(Date.UTC(y,m-1,dd)+(hours+offset)*3600e3);}

// Open-Meteo times ("YYYY-MM-DDTHH:MM") are Eastern; read them as Eastern on any device.
const etMs=s=>{const [d,t]=s.split('T');const [h,m]=t.split(':').map(Number);return etTime(d,h+m/60).getTime();};
// Works on older iPhones too (no Array.findLastIndex before iOS 15.4).
const lastIdx=(a,f)=>{for(let i=a.length-1;i>=0;i--)if(f(a[i]))return i;return -1;};
const IS_CAPTAIN=location.hash.startsWith('#captain');

