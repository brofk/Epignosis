import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata={title:{default:'World Prayer and Missions Network | Epignosis Christian Family',template:'%s | WPMN & ECF'},description:'Revealing Christ. Equipping His Family. Discipling the Nations. Meet WPMN and Epignosis Christian Family in Baguio, San Nicolas, and Candon.',icons:{icon:'/favicon.svg',shortcut:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
