import Link from 'next/link';
import {getChatGPTUser,chatGPTSignInPath} from '@/app/chatgpt-auth';
import {editor} from '@/lib/security';
import {EditorApp,EditorAccess} from '@/components/site/editor';

export const dynamic='force-dynamic';
export const metadata={title:'Website Editor',robots:{index:false,follow:false},referrer:'no-referrer' as const};

export default async function Editor(){
 const user=await getChatGPTUser();
 if(!user)return <EditorAccess signIn={chatGPTSignInPath('/editor')} signedIn={false}/>;

 const access=await editor().catch(()=>undefined);
 if(access===undefined)return <div className="editor-access"><h1>The editor is temporarily unavailable.</h1><p>Please refresh in a moment. Your saved content is safe.</p><Link href="/">Return to the website</Link></div>;
 if(!access)return <EditorAccess signIn="" signedIn name={user.displayName}/>;
 return <EditorApp/>;
}
