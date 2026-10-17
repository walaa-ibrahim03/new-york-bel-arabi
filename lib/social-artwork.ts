// Original editorial artwork only. Never loads a publisher photo, canvas image, API or storage service.
export function artworkLines(title: string, measure: (text:string)=>number, width: number, limit=5) {
  const words=title.trim().split(/\s+/), lines:string[]=[];let line="";
  for(const word of words){const next=line?`${line} ${word}`:word;if(line&&measure(next)>width){lines.push(line);line=word;}else line=next;}
  if(line)lines.push(line);
  return lines.length>limit?[...lines.slice(0,limit-1),lines[limit-1]+"…"]:lines;
}
export async function createSocialArtwork(title:string,category:string) {
  await document.fonts.ready;
  const canvas=document.createElement("canvas");canvas.width=1080;canvas.height=1080;
  const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Canvas unavailable");
  const font=getComputedStyle(document.body).fontFamily;
  ctx.fillStyle="#0f172a";ctx.fillRect(0,0,1080,1080);
  ctx.fillStyle="#1e293b";for(let i=0;i<9;i++)ctx.fillRect(i*135,760-(i%3)*65,90,320);
  ctx.fillStyle="#fbbf24";ctx.fillRect(0,0,1080,22);ctx.fillRect(80,290,920,6);
  ctx.direction="ltr";ctx.textAlign="left";ctx.font="bold 58px Arial";ctx.fillText("NY bel Arabi",80,125);
  ctx.direction="rtl";ctx.textAlign="right";ctx.font=`bold 32px ${font}`;ctx.fillStyle="#fbbf24";ctx.fillText(category.slice(0,50),1000,235);
  ctx.fillStyle="#ffffff";ctx.font=`bold 54px ${font}`;
  const lines=artworkLines(title,t=>ctx.measureText(t).width,900);lines.forEach((line,i)=>ctx.fillText(line,1000,400+i*100,900));
  ctx.font=`28px ${font}`;ctx.fillStyle="#e2e8f0";ctx.fillText("الخبر في دقيقة · غلاف تحريري",1000,1000);
  return canvas.toDataURL("image/png");
}
