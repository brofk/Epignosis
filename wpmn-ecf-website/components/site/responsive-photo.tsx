const bundled=new Set(['/images/shared-life.jpg','/images/ecf-sign.jpg','/images/campus-baguio.jpg','/images/campus-san-nicolas.jpg','/images/campus-candon.jpg']);
export function ResponsivePhoto({src,alt,className,priority=false,sizes='(max-width: 700px) 100vw, 50vw'}:{src:string;alt:string;className?:string;priority?:boolean;sizes?:string}){
 const optimized=bundled.has(src),base=src.replace(/\.jpg$/,'');
 const dimensions:Record<string,[number,number]>={'/images/shared-life.jpg':[1024,1536],'/images/ecf-sign.jpg':[1152,1536],'/images/campus-baguio.jpg':[1536,864],'/images/campus-san-nicolas.jpg':[1600,1200],'/images/campus-candon.jpg':[1600,1600]};
 return <img width={dimensions[src]?.[0]} height={dimensions[src]?.[1]} src={optimized?base+'-1280.webp':src} srcSet={optimized?`${base}-640.webp 640w, ${base}-1280.webp 1280w`:undefined} sizes={optimized?sizes:undefined} alt={alt} className={className} loading={priority?'eager':'lazy'} fetchPriority={priority?'high':undefined} decoding="async"/>;
}
