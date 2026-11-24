const demoMatches = [
 {home:"ريال مدريد",away:"مانشستر سيتي",h:"⚪",a:"🔵",score:"21:00",state:"upcoming",league:"دوري أبطال أوروبا"},
 {home:"ليفربول",away:"أرسنال",h:"🔴",a:"🔴",score:"17:30",state:"upcoming",league:"الدوري الإنجليزي"},
 {home:"برشلونة",away:"ريال سوسيداد",h:"🔵",a:"⚪",score:"20:00",state:"upcoming",league:"الدوري الإسباني"}
];
let activeFilter="all";
const list=document.querySelector("#matchList");
function renderMatches(){
 const rows=demoMatches.filter(m=>activeFilter==="all"||m.state===activeFilter);
 list.innerHTML=rows.map(m=>`<article class="match"><div class="team"><span class="crest">${m.h}</span><span>${m.home}</span></div><div class="score"><b>${m.score}</b><small>${m.league}</small></div><div class="team"><span>${m.away}</span><span class="crest">${m.a}</span></div></article>`).join("")||'<p class="note">لا توجد مباريات في هذا التصنيف.</p>';
}
renderMatches();
document.querySelectorAll(".filter").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll(".filter").forEach(x=>x.classList.remove("active"));btn.classList.add("active");activeFilter=btn.dataset.filter;renderMatches()}));
document.querySelectorAll(".tab").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));btn.classList.add("active");document.querySelectorAll("main .panel").forEach(x=>x.classList.add("hidden"));document.getElementById(btn.dataset.tab).classList.remove("hidden")}));
let deferredPrompt;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;document.querySelector("#installBtn").classList.remove("hidden")});
document.querySelector("#installBtn").addEventListener("click",async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;document.querySelector("#installBtn").classList.add("hidden")});
if("serviceWorker" in navigator && location.protocol!=="file:"){window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js").catch(console.error))}
